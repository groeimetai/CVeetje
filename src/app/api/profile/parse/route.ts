import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import type { ProfileInputSource, ParsedLinkedIn } from '@/types';

// Schema for structured profile extraction via LLM
// Note: Reduced nullable fields to stay under 16 union parameter limit
const profileSchema = z.object({
  fullName: z.string().describe('Full name of the person'),
  headline: z.string().nullable().describe('Professional headline/title'),
  location: z.string().nullable().describe('Location (city, country)'),
  about: z.string().nullable().describe('About/summary section'),
  // Contact information grouped to reduce union count
  contactInfo: z.object({
    email: z.string().describe('Email address if visible, empty string if not found'),
    phone: z.string().describe('Phone number if visible, empty string if not found'),
    linkedinUrl: z.string().describe('LinkedIn profile URL, empty string if not found'),
    website: z.string().describe('Personal website URL, empty string if not found'),
    github: z.string().describe('GitHub profile URL, empty string if not found'),
  }).describe('Contact information extracted from the profile - use empty strings for missing fields'),
  experience: z.array(
    z.object({
      title: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      location: z.string().describe('Job location, empty string if not specified'),
      startDate: z.string().describe('Start date (e.g., "Jan 2020" or "2020")'),
      endDate: z.string().describe('End date, empty string if current position'),
      description: z.string().describe('Job description, empty string if not available'),
      isCurrentRole: z.boolean().describe('Whether this is the current role'),
    })
  ).describe('Work experience entries'),
  education: z.array(
    z.object({
      school: z.string().describe('School/university name'),
      degree: z.string().describe('Degree type, empty string if not specified'),
      fieldOfStudy: z.string().describe('Field of study, empty string if not specified'),
      startYear: z.string().describe('Start year, empty string if not specified'),
      endYear: z.string().describe('End year, empty string if not specified'),
    })
  ).describe('Education entries'),
  skills: z.array(
    z.object({
      name: z.string().describe('Skill name'),
    })
  ).describe('Skills'),
  languages: z.array(
    z.object({
      language: z.string().describe('Language name'),
      proficiency: z.string().describe('Proficiency level, empty string if not specified'),
    })
  ).describe('Languages'),
  certifications: z.array(
    z.object({
      name: z.string().describe('Certification name'),
      issuer: z.string().describe('Issuing organization, empty string if not specified'),
      issueDate: z.string().describe('Issue date, empty string if not specified'),
    })
  ).describe('Certifications'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sources = body.sources as ProfileInputSource[] | undefined;
    const provider = body.provider as string | undefined;
    const model = body.model as string | undefined;

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: 'At least one source is required' },
        { status: 400 }
      );
    }

    // Separate text and file sources
    const textSources = sources.filter(s => s.type === 'text' && s.text);
    const fileSources = sources.filter(s => s.type === 'file' && s.file);

    // If only text sources, use local parser (no AI call needed)
    if (fileSources.length === 0 && textSources.length > 0) {
      const combinedText = textSources.map(s => s.text).join('\n\n');
      const parsed = parseLinkedInProfile(combinedText);

      if (!parsed.fullName) {
        return NextResponse.json(
          { error: 'Could not parse profile. Please ensure you included complete profile information.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: parsed,
        // No usage for text-only parsing (no AI call)
      });
    }

    // File sources present - requires authentication and API key
    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's API key
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please add your API key in Settings.' },
        { status: 400 }
      );
    }

    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const userProvider = provider || userData.apiKey.provider;
    const userModel = model || userData.apiKey.model;

    // Create AI provider
    const aiProvider = createAIProvider(userProvider, apiKey);

    // Build the prompt for multi-source extraction
    const sourceDescriptions: string[] = [];
    let fileIndex = 1;

    for (const source of sources) {
      if (source.type === 'text' && source.text) {
        sourceDescriptions.push(`Text source: Additional profile information or context.`);
      } else if (source.type === 'file' && source.file) {
        const isPdf = source.file.mediaType === 'application/pdf';
        sourceDescriptions.push(`File ${fileIndex}: ${source.file.name} (${isPdf ? 'PDF document' : 'image/screenshot'})`);
        fileIndex++;
      }
    }

    const extractionPrompt = `Extract all professional profile information from the provided sources.

Sources overview:
${sourceDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Instructions:
- Combine information from ALL sources into a single comprehensive profile
- If the same information appears in multiple sources, use the most complete version
- Extract all available information including:
  - Full name
  - Professional headline/title
  - Location
  - About/Summary section
  - **CONTACT INFORMATION** (IMPORTANT - look carefully for these):
    - Email address (look in header, contact sections, footer, or anywhere visible)
    - Phone number (look in header, contact sections, or anywhere visible)
    - LinkedIn URL (often in format linkedin.com/in/username)
    - Personal website or portfolio URL
    - GitHub profile URL
  - ALL work experience entries with dates and descriptions
  - Education history
  - Skills (technical and soft skills)
  - Languages and proficiency levels
  - Certifications
- Be thorough and extract as much information as possible
- If a field is not visible or available in any source, set it to null
- Merge duplicates intelligently (same job at same company = one entry)`;

    try {
      // Build content array for the message
      type MessageContent =
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
        | { type: 'file'; data: string; mediaType: string };

      const messageContent: MessageContent[] = [
        {
          type: 'text',
          text: extractionPrompt,
        },
      ];

      // Add all sources to the message
      for (const source of sources) {
        if (source.type === 'text' && source.text) {
          messageContent.push({
            type: 'text',
            text: `\n\n--- Text Source ---\n${source.text}`,
          });
        } else if (source.type === 'file' && source.file) {
          const isPdf = source.file.mediaType === 'application/pdf';

          if (isPdf) {
            // For PDFs, use file type
            messageContent.push({
              type: 'file',
              data: source.file.base64,
              mediaType: source.file.mediaType,
            });
          } else {
            // For images, use image type
            messageContent.push({
              type: 'image',
              image: source.file.base64,
            });
          }
        }
      }

      // Use generateObject with vision capabilities
      const { object, usage } = await generateObject({
        model: aiProvider(userModel),
        schema: profileSchema,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      });

      // Helper to convert empty strings to null for compatibility
      const emptyToNull = (val: string): string | null => val === '' ? null : val;

      // Convert to ParsedLinkedIn format
      const parsed: ParsedLinkedIn = {
        fullName: object.fullName,
        headline: object.headline,
        location: object.location,
        about: object.about,
        experience: object.experience.map(exp => ({
          ...exp,
          location: emptyToNull(exp.location),
          endDate: emptyToNull(exp.endDate),
          description: emptyToNull(exp.description),
        })),
        education: object.education.map(edu => ({
          ...edu,
          degree: emptyToNull(edu.degree),
          fieldOfStudy: emptyToNull(edu.fieldOfStudy),
          startYear: emptyToNull(edu.startYear),
          endYear: emptyToNull(edu.endYear),
        })),
        skills: object.skills,
        languages: object.languages.map(lang => ({
          ...lang,
          proficiency: emptyToNull(lang.proficiency),
        })),
        certifications: object.certifications.map(cert => ({
          ...cert,
          issuer: emptyToNull(cert.issuer),
          issueDate: emptyToNull(cert.issueDate),
        })),
        // Contact info extracted from source (convert empty strings to undefined)
        email: object.contactInfo.email || undefined,
        phone: object.contactInfo.phone || undefined,
        linkedinUrl: object.contactInfo.linkedinUrl || undefined,
        website: object.contactInfo.website || undefined,
        github: object.contactInfo.github || undefined,
      };

      return NextResponse.json({
        success: true,
        data: parsed,
        usage: usage ? {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
        } : undefined,
      });
    } catch (aiError) {
      console.error('AI extraction error:', aiError);

      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';

      // Check for specific error types
      if (errorMessage.includes('does not support') || errorMessage.includes('vision') || errorMessage.includes('image')) {
        return NextResponse.json(
          { error: 'Your selected AI model does not support image/PDF input. Please use text input or change your model in Settings.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Failed to extract profile from sources: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Profile parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse profile information' },
      { status: 500 }
    );
  }
}

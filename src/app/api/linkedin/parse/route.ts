import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import type { LinkedInInputSource, ParsedLinkedIn } from '@/types';

// Schema for structured LinkedIn profile extraction via LLM
const linkedInSchema = z.object({
  fullName: z.string().describe('Full name of the person'),
  headline: z.string().nullable().describe('Professional headline/title'),
  location: z.string().nullable().describe('Location (city, country)'),
  about: z.string().nullable().describe('About/summary section'),
  experience: z.array(
    z.object({
      title: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      location: z.string().nullable().describe('Job location'),
      startDate: z.string().describe('Start date (e.g., "Jan 2020" or "2020")'),
      endDate: z.string().nullable().describe('End date or null if current'),
      description: z.string().nullable().describe('Job description'),
      isCurrentRole: z.boolean().describe('Whether this is the current role'),
    })
  ).describe('Work experience entries'),
  education: z.array(
    z.object({
      school: z.string().describe('School/university name'),
      degree: z.string().nullable().describe('Degree type (e.g., Bachelor, Master)'),
      fieldOfStudy: z.string().nullable().describe('Field of study'),
      startYear: z.string().nullable().describe('Start year'),
      endYear: z.string().nullable().describe('End year'),
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
      proficiency: z.string().nullable().describe('Proficiency level'),
    })
  ).describe('Languages'),
  certifications: z.array(
    z.object({
      name: z.string().describe('Certification name'),
      issuer: z.string().nullable().describe('Issuing organization'),
      issueDate: z.string().nullable().describe('Issue date'),
    })
  ).describe('Certifications'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a file-based parse request
    const source = body.source as LinkedInInputSource | undefined;
    const provider = body.provider as string | undefined;
    const model = body.model as string | undefined;

    // If it's a text-only request (old format or text tab)
    if (!source || source.type === 'text') {
      const rawText = body.rawText || source?.text;

      if (!rawText || typeof rawText !== 'string') {
        return NextResponse.json(
          { error: 'Raw text is required' },
          { status: 400 }
        );
      }

      const parsed = parseLinkedInProfile(rawText);

      if (!parsed.fullName) {
        return NextResponse.json(
          { error: 'Could not parse LinkedIn profile. Please ensure you copied the full profile.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: parsed,
        // No usage for text parsing (no AI call)
      });
    }

    // File-based parsing - requires authentication and API key
    if (source.type === 'file') {
      if (!source.file) {
        return NextResponse.json(
          { error: 'File data is required' },
          { status: 400 }
        );
      }

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

      // Determine content type for the file
      const isPdf = source.file.mediaType === 'application/pdf';

      // Build the prompt for extraction
      const extractionPrompt = `Extract all LinkedIn profile information from this ${isPdf ? 'PDF document' : 'image'}.
This is a LinkedIn profile export or screenshot. Extract all available information including:
- Full name
- Professional headline
- Location
- About/Summary section
- All work experience entries with dates and descriptions
- Education history
- Skills
- Languages and proficiency levels
- Certifications

Be thorough and extract as much information as possible. If a field is not visible or available, set it to null.`;

      try {
        // Build content array for the message
        const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string } | { type: 'file'; data: string; mediaType: string }> = [
          {
            type: 'text',
            text: extractionPrompt,
          },
        ];

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

        // Use generateObject with vision capabilities
        const { object, usage } = await generateObject({
          model: aiProvider(userModel),
          schema: linkedInSchema,
          messages: [
            {
              role: 'user',
              content: messageContent,
            },
          ],
        });

        // Convert to ParsedLinkedIn format
        const parsed: ParsedLinkedIn = {
          fullName: object.fullName,
          headline: object.headline,
          location: object.location,
          about: object.about,
          experience: object.experience,
          education: object.education,
          skills: object.skills,
          languages: object.languages,
          certifications: object.certifications,
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
          { error: `Failed to extract profile from file: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('LinkedIn parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse LinkedIn profile' },
      { status: 500 }
    );
  }
}

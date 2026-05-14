import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth } from '@/lib/firebase/admin';
import { createAIProvider } from '@/lib/ai/providers';
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import { resolveProvider, refundPlatformCredits, ProviderError } from '@/lib/ai/platform-provider';
import { getCurrentDateContext } from '@/lib/ai/date-context';
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
    birthDate: z.string().describe('Date of birth in DD-MM-YYYY format if visible (often labeled "Geboortedatum", "Date of birth", "Born", etc.), empty string if not found'),
  }).describe('Contact and personal information extracted from the profile - use empty strings for missing fields'),
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
  projects: z.array(
    z.object({
      title: z.string().describe('Project name'),
      description: z.string().describe('Project description, empty string if not available'),
      technologies: z.array(z.string()).describe('Technologies/tools used in the project'),
      url: z.string().describe('Link to project/repo, empty string if not found'),
      startDate: z.string().describe('Start date, empty string if not specified'),
      endDate: z.string().describe('End date, empty string if not specified'),
      role: z.string().describe('Role in the project, empty string if not specified'),
    })
  ).describe('Projects (personal, open source, academic, portfolio)'),
  interests: z.array(z.string()).describe('Personal interests/hobbies — only items literally listed under a "Hobbies", "Interests", "Interesses", or similar heading. Empty array if no such section is present in the source.'),
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

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'profile-parse' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const userProvider = provider || resolved.providerName;
    const userModel = model || resolved.model;

    // Create AI provider (use resolved key, but allow provider/model override from request)
    const aiProvider = userProvider === resolved.providerName
      ? resolved.provider
      : createAIProvider(userProvider, resolved.apiKey);

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

${getCurrentDateContext('en')}

Sources overview:
${sourceDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

═══════════════════════════════════════════════
ANTI-HALLUCINATIE — STRICT
═══════════════════════════════════════════════

EXTRACTION ONLY — NEVER INVENT. This is a pure extraction task. You are reading a CV/profile and pulling out facts. You are NOT writing a CV.

- If you don't see it in the source, it doesn't exist. Use empty string / null / empty array.
- NEVER invent: emails ("firstname@example.com"), phone numbers, websites, LinkedIn URLs, GitHub URLs, dates of birth.
- NEVER invent skills, certifications, languages, or projects that aren't explicitly listed.
- NEVER fabricate job descriptions. If the source shows a title and company but no description, return an empty description — don't write a generic one based on the title.
- NEVER infer education from "looks like he/she would have studied X". If the source doesn't show an education entry, return an empty education array.
- NEVER invent dates. If the source shows "2020-present" return that. Don't guess at start months.

The user's CV depends on this extraction being TRUTHFUL. An empty field is the correct answer when the source is silent. A fabricated field is a CV-killer downstream.

═══════════════════════════════════════════════
EXTRACTION RULES
═══════════════════════════════════════════════

- Combine information from ALL sources into a single comprehensive profile
- If the same information appears in multiple sources, use the most complete version
- Merge duplicates intelligently (same job at same company = one entry)

Fields to extract (only when visible in source):

- **Full name**: The candidate's actual personal name (first + last). This is a HUMAN NAME — typically two or three words, first word is a given name. CRITICAL: The following are NEVER valid names: "About", "Summary", "Profile", "Contact", "Experience", "Education", "Skills", "Curriculum Vitae", "CV", "Resume", "Over mij", "Samenvatting", "Personalia", "Profiel", "Werkervaring", "Opleiding", or any other section header. If the actual human name is not clearly visible in the document, return an empty string rather than guessing. Do NOT pick up labels, headings, or the word under a photo caption as the name.
- Professional headline/title
- Location
- About/Summary section (verbatim from source, not a re-summarization)
- **CONTACT & PERSONAL INFORMATION** — look carefully but only return what's literally there:
  - Email address (look in header, contact sections, footer)
  - Phone number (look in header, contact sections)
  - LinkedIn URL (format linkedin.com/in/username)
  - Personal website or portfolio URL
  - GitHub profile URL
  - Date of birth (often labeled "Geboortedatum", "Date of birth", "Born", "DOB"). Normalize to DD-MM-YYYY format. Leave empty if not visible.
- ALL work experience entries with dates and descriptions
- Education history (only entries actually listed in source)
- Skills — only skills literally listed in source (don't infer from job titles)
- Languages and proficiency levels — only languages actually mentioned
- Certifications — only certifications actually listed
- **Interests/hobbies** — only items listed under a dedicated section heading like "Hobbies", "Interests", "Interesses", "Hobby's". Return them verbatim (e.g. "photography", "mountain biking"). Empty array if no such section exists. NEVER derive hobbies from job descriptions, about-text, or general atmosphere.

Be thorough about extracting what IS there. Be empty/null about what ISN'T there.`;

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
        // Low temperature: extraction is mechanical reading, not creative writing.
        // High temperature encourages "helpful" embellishments which here means
        // inventing fields that aren't actually in the source.
        temperature: 0.1,
      });

      // Helper to convert empty strings to null for compatibility
      const emptyToNull = (val: string): string | null => val === '' ? null : val;

      // Guard against the AI latching onto a section header / document label as
      // the candidate's name — we've seen "About", "Summary", etc. come back
      // when the source file has an unusual layout or the name isn't clearly
      // separated from the section markers.
      const SUSPECT_NAME_TOKENS = new Set([
        'about', 'summary', 'profile', 'profiel', 'contact', 'contactgegevens',
        'experience', 'werkervaring', 'education', 'opleiding', 'skills',
        'vaardigheden', 'languages', 'talen', 'certifications',
        'licenties en certificaten', 'projects', 'projecten',
        'curriculum vitae', 'cv', 'resume', 'over mij', 'samenvatting',
        'personalia', 'personal information',
      ]);
      const cleanedName = (object.fullName || '').trim();
      const nameLower = cleanedName.toLowerCase();
      if (SUSPECT_NAME_TOKENS.has(nameLower) || cleanedName.length < 2) {
        // Refund credits if we charged for this call — the output is unusable.
        try {
          if (resolved.mode === 'platform') {
            await refundPlatformCredits(userId, 'profile-parse');
          }
        } catch {
          // Best-effort refund; don't block the error response
        }
        return NextResponse.json(
          {
            error: 'Could not identify the candidate name in the document. ' +
              'Make sure the name is clearly visible at the top of your CV/profile. ' +
              'Tip: include a LinkedIn export or add your name as plain text alongside the file.',
          },
          { status: 400 }
        );
      }

      // Convert to ParsedLinkedIn format
      const parsed: ParsedLinkedIn = {
        fullName: cleanedName,
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
        projects: object.projects.map(proj => ({
          title: proj.title,
          description: emptyToNull(proj.description),
          technologies: proj.technologies || [],
          url: emptyToNull(proj.url),
          startDate: emptyToNull(proj.startDate),
          endDate: emptyToNull(proj.endDate),
          role: emptyToNull(proj.role),
        })),
        // Contact info extracted from source (convert empty strings to undefined)
        email: object.contactInfo.email || undefined,
        phone: object.contactInfo.phone || undefined,
        linkedinUrl: object.contactInfo.linkedinUrl || undefined,
        website: object.contactInfo.website || undefined,
        github: object.contactInfo.github || undefined,
        birthDate: object.contactInfo.birthDate || undefined,
        interests: (object.interests || []).map(i => i.trim()).filter(Boolean),
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

      // Refund platform credits on failure
      if (resolved.mode === 'platform') {
        await refundPlatformCredits(userId, 'profile-parse');
      }

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

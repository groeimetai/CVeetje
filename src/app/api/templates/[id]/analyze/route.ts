import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createAIProvider, getModelId } from '@/lib/ai/providers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import type { DetectedTemplateField, TemplateAnalysisResult, ProfileFieldMapping } from '@/types';

// Schema for AI-detected fields
const detectedFieldSchema = z.object({
  label: z.string().describe('The label text found in the template (e.g., "Voornaam:", "Naam:", "Opleiding")'),
  page: z.number().describe('The 0-indexed page number where the field is found'),
  x: z.number().describe('Estimated X coordinate from the left edge in PDF points (1 point = 1/72 inch, typical PDF is 595 points wide for A4)'),
  y: z.number().describe('Estimated Y coordinate from the BOTTOM edge in PDF points (typical PDF is 842 points tall for A4). Remember: PDF y=0 is at BOTTOM, not top.'),
  width: z.number().optional().describe('Estimated width of the text area in points'),
  suggestedMappingType: z.enum(['personal', 'experience', 'education', 'skill', 'language', 'certification', 'custom']).describe('What type of profile data this field should be mapped to'),
  suggestedField: z.string().optional().describe('The specific field within the type (e.g., "firstName", "company", "degree")'),
  suggestedIndex: z.number().optional().describe('For array fields (experience, education, skill), the index (0, 1, 2, etc.)'),
  confidence: z.enum(['low', 'medium', 'high']).describe('How confident you are in this detection'),
});

const analysisResultSchema = z.object({
  templateType: z.string().optional().describe('The type of template (e.g., "recruitment", "academic", "corporate")'),
  detectedFields: z.array(detectedFieldSchema).describe('All detected fillable fields in the template'),
});

// Convert AI output to our type
function convertToProfileFieldMapping(
  type: string,
  field?: string,
  index?: number
): ProfileFieldMapping | undefined {
  switch (type) {
    case 'personal':
      if (field && ['firstName', 'lastName', 'fullName', 'birthDate', 'nationality', 'city', 'email', 'phone'].includes(field)) {
        return { type: 'personal', field: field as 'firstName' | 'lastName' | 'fullName' | 'birthDate' | 'nationality' | 'city' | 'email' | 'phone' };
      }
      break;
    case 'experience':
      if (typeof index === 'number' && field && ['company', 'title', 'period', 'description', 'location'].includes(field)) {
        return { type: 'experience', index, field: field as 'company' | 'title' | 'period' | 'description' | 'location' };
      }
      break;
    case 'education':
      if (typeof index === 'number' && field && ['school', 'degree', 'fieldOfStudy', 'period'].includes(field)) {
        return { type: 'education', index, field: field as 'school' | 'degree' | 'fieldOfStudy' | 'period' };
      }
      break;
    case 'skill':
      if (typeof index === 'number') {
        return { type: 'skill', index };
      }
      break;
    case 'language':
      if (typeof index === 'number' && field && ['language', 'proficiency'].includes(field)) {
        return { type: 'language', index, field: field as 'language' | 'proficiency' };
      }
      break;
    case 'certification':
      if (typeof index === 'number') {
        return { type: 'certification', index };
      }
      break;
  }
  return undefined;
}

// POST - Analyze a template using AI vision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    // Get user's API key
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.apiKey) {
      return NextResponse.json(
        { error: 'Please configure your API key in Settings first' },
        { status: 400 }
      );
    }

    const { provider, encryptedKey, model } = userData.apiKey;
    const apiKey = decrypt(encryptedKey);

    // Get the template
    const templateDoc = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id)
      .get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const templateData = templateDoc.data();
    const storageUrl = templateData?.storageUrl;
    const pageCount = templateData?.pageCount || 1;

    if (!storageUrl) {
      return NextResponse.json(
        { error: 'Template file not found' },
        { status: 404 }
      );
    }

    // Parse request for optional page images
    // If provided, use them instead of fetching from URL
    const body = await request.json().catch(() => ({}));
    const pageImages = body.pageImages as string[] | undefined; // Base64 encoded images of each page

    // Create AI provider
    const aiProvider = createAIProvider(provider, apiKey);
    const modelId = getModelId(provider, model);

    // Build the prompt
    const systemPrompt = `You are a CV/resume template analyzer. You analyze PDF templates used by recruiters to fill in candidate information.

Your task is to identify all the fillable fields in the template - places where text should be entered.

For each field you find:
1. Identify the label (the text that describes what should be filled in, like "Naam:", "Functie:", "Opleiding")
2. Estimate its position in PDF coordinates:
   - X: distance from left edge in points (A4 = 595 points wide)
   - Y: distance from BOTTOM edge in points (A4 = 842 points tall) - this is where the text should START being drawn
3. Estimate the width of the text area
4. Suggest what profile data should map to this field

Common Dutch labels and their mappings:
- "Naam" / "Achternaam" → personal.lastName
- "Voornaam" → personal.firstName
- "Geboortedatum" → personal.birthDate
- "Nationaliteit" → personal.nationality
- "Woonplaats" / "Stad" → personal.city
- "E-mail" / "Email" → personal.email
- "Telefoon" / "Tel" → personal.phone
- "Opleiding" / "Opleidingen" → education entries
- "Werkervaring" / "Ervaring" → experience entries
- "Functie" → experience.title
- "Werkgever" / "Bedrijf" → experience.company
- "Periode" → experience.period or education.period
- "Werkzaamheden" / "Taken" → experience.description
- "Vaardigheden" / "Skills" → skill entries
- "Talen" / "Languages" → language entries
- "Certificaten" → certification entries

IMPORTANT: Y coordinates in PDF start from the BOTTOM of the page. If a field appears near the top of a page, it will have a HIGH Y value (e.g., 700-800 for A4). If near the bottom, LOW Y value (e.g., 50-150).

For experience/education sections that have multiple entries (like job 1, job 2, etc.), use index 0 for the first entry, 1 for the second, etc.`;

    // Build messages with images if provided
    const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [];

    if (pageImages && pageImages.length > 0) {
      userContent.push({
        type: 'text',
        text: `Analyze this ${pageCount}-page CV template and identify all fillable fields. Here are the page images:`,
      });

      for (let i = 0; i < pageImages.length; i++) {
        userContent.push({
          type: 'text',
          text: `Page ${i + 1}:`,
        });
        userContent.push({
          type: 'image',
          image: pageImages[i], // Should be base64 data URL or URL
        });
      }

      userContent.push({
        type: 'text',
        text: 'Please identify all fields where candidate information should be filled in. For each field, provide the label, estimated PDF coordinates (x, y from bottom), and suggested data mapping.',
      });
    } else {
      // No images provided - return error
      return NextResponse.json(
        { error: 'Page images are required for template analysis. Please provide base64-encoded images of each PDF page.' },
        { status: 400 }
      );
    }

    // Call AI with vision
    const { object: result } = await generateObject({
      model: aiProvider(modelId),
      schema: analysisResultSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    // Convert AI output to our types
    const detectedFields: DetectedTemplateField[] = result.detectedFields.map((field) => ({
      label: field.label,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      suggestedMapping: convertToProfileFieldMapping(
        field.suggestedMappingType,
        field.suggestedField,
        field.suggestedIndex
      ),
      confidence: field.confidence,
    }));

    const analysisResult: TemplateAnalysisResult = {
      pageCount,
      detectedFields,
      templateType: result.templateType,
    };

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('Error analyzing template:', error);
    return NextResponse.json(
      { error: 'Failed to analyze template' },
      { status: 500 }
    );
  }
}

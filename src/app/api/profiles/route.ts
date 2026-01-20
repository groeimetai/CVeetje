import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { profileSaveRequestSchema, validateRequestBody, isValidationError } from '@/lib/validation/schemas';
import type { SavedProfileSummary, ParsedLinkedIn } from '@/types';

// GET - List all profiles for the user
export async function GET(request: NextRequest) {
  try {
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

    // Get all profiles for the user
    const profilesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .orderBy('updatedAt', 'desc')
      .get();

    const profiles: SavedProfileSummary[] = profilesSnapshot.docs.map(doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = doc.data() as any;
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        headline: data.parsedData?.headline || null,
        experienceCount: data.parsedData?.experience?.length || 0,
        avatarUrl: data.avatarUrl || null,
        isDefault: data.isDefault,
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      profiles,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

// POST - Create a new profile
export async function POST(request: NextRequest) {
  try {
    console.log('[API Profiles POST] Starting...');

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('[API Profiles POST] No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      console.log('[API Profiles POST] Verifying token...');
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
      console.log('[API Profiles POST] Token verified, userId:', userId);
    } catch (authError) {
      console.error('[API Profiles POST] Token verification failed:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse and VALIDATE request body
    const body = await request.json();
    console.log('[API Profiles POST] Received body, validating...');

    let validatedData;
    try {
      validatedData = validateRequestBody(profileSaveRequestSchema, body);
      console.log('[API Profiles POST] Validation passed:', {
        name: validatedData.name,
        hasDescription: !!validatedData.description,
        hasParsedData: !!validatedData.parsedData,
        hasAvatarUrl: !!validatedData.avatarUrl,
        isDefault: validatedData.isDefault
      });
    } catch (validationError) {
      console.log('[API Profiles POST] Validation failed:', validationError);
      if (isValidationError(validationError)) {
        return NextResponse.json(validationError.toJSON(), { status: 400 });
      }
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { name, description, parsedData, avatarUrl, isDefault } = validatedData;

    console.log('[API Profiles POST] Getting Firestore...');
    const db = getAdminDb();
    const now = new Date();

    // If this profile should be default, unset other defaults
    if (isDefault) {
      console.log('[API Profiles POST] Checking for existing defaults...');
      const existingDefaults = await db
        .collection('users')
        .doc(userId)
        .collection('profiles')
        .where('isDefault', '==', true)
        .get();

      console.log('[API Profiles POST] Found', existingDefaults.docs.length, 'existing defaults');

      if (existingDefaults.docs.length > 0) {
        const batch = db.batch();
        existingDefaults.docs.forEach(doc => {
          batch.update(doc.ref, { isDefault: false });
        });
        await batch.commit();
        console.log('[API Profiles POST] Cleared existing defaults');
      }
    }

    // Create the profile - build object without undefined values (Firestore rejects undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData: Record<string, any> = {
      name,
      parsedData: parsedData as ParsedLinkedIn,
      isDefault: isDefault || false,
      createdAt: now,
      updatedAt: now,
    };

    // Only add description if it has a value
    if (description) {
      profileData.description = description;
    }

    // Only add avatarUrl if it has a value
    if (avatarUrl) {
      profileData.avatarUrl = avatarUrl;
    }

    console.log('[API Profiles POST] Creating profile document...');
    const docRef = await db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .add(profileData);

    console.log('[API Profiles POST] Profile created with ID:', docRef.id);

    return NextResponse.json({
      success: true,
      profile: {
        id: docRef.id,
        ...profileData,
      },
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

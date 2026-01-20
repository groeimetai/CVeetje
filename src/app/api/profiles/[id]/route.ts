import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { profileSaveRequestSchema, validateRequestBody, isValidationError } from '@/lib/validation/schemas';
import type { SavedProfile, ParsedLinkedIn } from '@/types';

// GET - Get a specific profile
export async function GET(
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

    // Get the profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .doc(id)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = profileDoc.data() as any;
    const profile: SavedProfile = {
      id: profileDoc.id,
      name: data.name,
      description: data.description,
      parsedData: data.parsedData,
      avatarUrl: data.avatarUrl || null,
      sourceInfo: data.sourceInfo,
      isDefault: data.isDefault,
      createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt?.toDate?.() || new Date(),
    };

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Update a profile
export async function PUT(
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

    // Parse and VALIDATE request body
    const body = await request.json();

    let validatedData;
    try {
      // Use partial validation for updates (all fields optional)
      validatedData = validateRequestBody(profileSaveRequestSchema.partial(), body);
    } catch (validationError) {
      if (isValidationError(validationError)) {
        return NextResponse.json(validationError.toJSON(), { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { name, description, parsedData, avatarUrl, isDefault } = validatedData;

    const db = getAdminDb();
    const profileRef = db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .doc(id);

    // Check if profile exists
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const now = new Date();

    // If this profile should be default, unset other defaults
    if (isDefault) {
      const existingDefaults = await db
        .collection('users')
        .doc(userId)
        .collection('profiles')
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      existingDefaults.docs.forEach(doc => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    // Build update object with only provided fields
    const updateData: Partial<Omit<SavedProfile, 'id' | 'createdAt'>> = {
      updatedAt: now,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parsedData !== undefined) updateData.parsedData = parsedData as ParsedLinkedIn;
    if (avatarUrl !== undefined) (updateData as Record<string, unknown>).avatarUrl = avatarUrl;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    await profileRef.update(updateData);

    // Get updated profile
    const updatedDoc = await profileRef.get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedData = updatedDoc.data() as any;

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedDoc.id,
        name: updatedData.name,
        description: updatedData.description,
        parsedData: updatedData.parsedData,
        avatarUrl: updatedData.avatarUrl || null,
        sourceInfo: updatedData.sourceInfo,
        isDefault: updatedData.isDefault,
        createdAt: updatedData.createdAt instanceof Date ? updatedData.createdAt : updatedData.createdAt?.toDate?.() || new Date(),
        updatedAt: updatedData.updatedAt instanceof Date ? updatedData.updatedAt : updatedData.updatedAt?.toDate?.() || new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a profile
export async function DELETE(
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
    const profileRef = db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .doc(id);

    // Check if profile exists
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await profileRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}

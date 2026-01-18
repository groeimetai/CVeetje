import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { encrypt } from '@/lib/encryption';
import type { LLMProvider } from '@/types';

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const { provider, apiKey, model } = await request.json() as {
      provider: LLMProvider;
      apiKey: string;
      model: string;
    };

    // Validate input
    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Basic validation - provider should be a non-empty string
    if (typeof provider !== 'string' || provider.length < 2) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Encrypt API key
    const encryptedKey = encrypt(apiKey);

    // Update user document (use set with merge to create if doesn't exist)
    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document with initial credits
      await userRef.set({
        email: '',
        displayName: null,
        photoURL: null,
        apiKey: {
          provider,
          encryptedKey,
          model,
        },
        credits: {
          balance: 5, // Initial free credits
          lastFreeReset: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Update existing user document
      await userRef.update({
        apiKey: {
          provider,
          encryptedKey,
          model,
        },
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API key save error:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    // Remove API key from user document
    const db = getAdminDb();
    await db.collection('users').doc(userId).update({
      apiKey: null,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API key remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove API key' },
      { status: 500 }
    );
  }
}

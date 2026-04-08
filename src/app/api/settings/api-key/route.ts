import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { encrypt } from '@/lib/encryption';
import { withUser } from '@/lib/auth/with-user';
import type { LLMProvider } from '@/types';

/**
 * Settings — API key management.
 *
 * Note: impersonation is disabled on all three handlers. API keys are
 * caller-private credentials; admins should never be able to read, modify
 * or delete an impersonated user's keys.
 */

export async function POST(request: NextRequest) {
  return withUser(
    request,
    async (req, { uid: userId }) => {
      try {
        // Get request body
        const { provider, apiKey, model } = (await req.json()) as {
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
          return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
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
            apiKey: { provider, encryptedKey, model },
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
            apiKey: { provider, encryptedKey, model },
            updatedAt: new Date(),
          });
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('API key save error:', error);
        return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
      }
    },
    { allowImpersonation: false },
  );
}

export async function PATCH(request: NextRequest) {
  return withUser(
    request,
    async (req, { uid: userId }) => {
      try {
        const { model } = (await req.json()) as { model: string };

        if (!model) {
          return NextResponse.json({ error: 'Model is required' }, { status: 400 });
        }

        // Verify user has an existing API key
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists || !userDoc.data()?.apiKey?.encryptedKey) {
          return NextResponse.json(
            { error: 'No API key configured. Please save an API key first.' },
            { status: 400 }
          );
        }

        // Update only model, keep existing provider and encrypted key
        await userRef.update({
          'apiKey.model': model,
          updatedAt: new Date(),
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Model update error:', error);
        return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
      }
    },
    { allowImpersonation: false },
  );
}

export async function DELETE(request: NextRequest) {
  return withUser(
    request,
    async (_req, { uid: userId }) => {
      try {
        // Remove API key from user document
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({
          apiKey: null,
          updatedAt: new Date(),
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('API key remove error:', error);
        return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 });
      }
    },
    { allowImpersonation: false },
  );
}

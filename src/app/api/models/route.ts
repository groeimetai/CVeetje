import { NextResponse } from 'next/server';
import { getProvidersWithFallback } from '@/lib/ai/models-registry';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const providers = await getProvidersWithFallback();

    return NextResponse.json({
      success: true,
      providers,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);

    // Return fallback on error
    const { FALLBACK_PROVIDERS } = await import('@/lib/ai/models-registry');

    return NextResponse.json({
      success: true,
      providers: FALLBACK_PROVIDERS,
      fetchedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}

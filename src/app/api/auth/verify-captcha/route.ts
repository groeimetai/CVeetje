import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptcha, isHuman } from '@/lib/recaptcha/server';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIP,
} from '@/lib/security/rate-limiter';

/**
 * Verify reCAPTCHA token before authentication
 *
 * This endpoint should be called before login/register to verify
 * the user is not a bot.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = checkRateLimit(
      clientIP || 'unknown',
      'auth-captcha',
      RATE_LIMITS.auth
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const body = await request.json();
    const { token, action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA
    const result = await verifyRecaptcha(token, action, clientIP || undefined);

    // Check if score passes threshold (0.5 for auth actions)
    const threshold = 0.5;
    const passed = isHuman(result, threshold);

    if (!passed) {
      console.warn(
        `reCAPTCHA failed for ${action}: score=${result.score}, errors=${result.errors.join(', ')}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Security verification failed. Please try again.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      score: result.score,
    });
  } catch (error) {
    console.error('Captcha verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

import { Timestamp } from 'firebase/firestore';
import { getUserData, resetMonthlyCredits } from '@/lib/firebase/firestore';

const MONTHLY_FREE_CREDITS = 5;
const RESET_DAY_OF_MONTH = 1; // First day of each month

/**
 * Check if user is eligible for monthly credit reset
 * Resets on the 1st of each month
 */
export async function checkAndResetMonthlyCredits(userId: string): Promise<boolean> {
  const userData = await getUserData(userId);

  if (!userData) {
    return false;
  }

  // Check if credits are properly initialized
  if (!userData.credits || !userData.credits.lastFreeReset) {
    // Credits not initialized, reset them now
    await resetMonthlyCredits(userId);
    return true;
  }

  const lastReset = userData.credits.lastFreeReset;
  const now = new Date();

  // Handle case where lastFreeReset might not be a Timestamp
  let lastResetDate: Date;
  if (lastReset && typeof lastReset.toDate === 'function') {
    lastResetDate = lastReset.toDate();
  } else if (lastReset instanceof Date) {
    lastResetDate = lastReset;
  } else {
    // Invalid date, reset credits
    await resetMonthlyCredits(userId);
    return true;
  }

  // Check if we're in a new month since last reset
  const isNewMonth =
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear();

  // Only reset if it's a new month and we're past the reset day
  if (isNewMonth && now.getDate() >= RESET_DAY_OF_MONTH) {
    await resetMonthlyCredits(userId);
    return true;
  }

  return false;
}

/**
 * Get number of days until next credit reset
 */
export function getDaysUntilReset(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, RESET_DAY_OF_MONTH);
  const diffTime = nextMonth.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format the next reset date
 */
export function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, RESET_DAY_OF_MONTH);

  return nextMonth.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(
  userId: string,
  required: number = 1
): Promise<boolean> {
  const userData = await getUserData(userId);
  return (userData?.credits?.balance ?? 0) >= required;
}

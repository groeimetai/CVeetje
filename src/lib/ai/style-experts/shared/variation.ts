/**
 * History-based variation utilities for style experts.
 *
 * The bug that motivated this refactor: the old style-generator tracked and
 * rotated `headerVariant/sectionStyle/fontPairing/themeBase/layout` — but for
 * creative (editorial renderer) and experimental (bold renderer) those fields
 * are ignored by the renderer. The editorial/bold primitives themselves were
 * NEVER rotated, so repeated calls often converged on the same values.
 *
 * Each style expert now declares its OWN `trackedVariationFields` (which may
 * include dotted paths like `bold.headerLayout`) and rotates those through
 * `rotateLeastUsed` after the AI output is merged with the fallback.
 */

import type { CVDesignTokens } from '@/types/design-tokens';

// ============ Generic pick helpers ============

export function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============ Dotted-path get/set ============

/**
 * Read a possibly-nested field from CVDesignTokens by dotted path.
 * e.g. getAtPath(tokens, 'bold.headerLayout') → tokens.bold?.headerLayout
 */
export function getAtPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cursor: unknown = obj;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

/**
 * Write a value to a possibly-nested field in CVDesignTokens by dotted path.
 * Creates intermediate objects as needed. Mutates `obj` in place.
 */
export function setAtPath(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

// ============ Usage counting + least-used picker ============

export type UsageCounts = Record<string, Record<string, number>>;

/**
 * Count usages of each dotted-path field across a style-history list.
 */
export function buildUsageCounts(
  history: CVDesignTokens[],
  trackedFields: readonly string[],
): UsageCounts {
  const counts: UsageCounts = {};
  for (const field of trackedFields) {
    counts[field] = {};
    for (const tokens of history) {
      const value = getAtPath(tokens, field);
      if (value) {
        counts[field][value] = (counts[field][value] || 0) + 1;
      }
    }
  }
  return counts;
}

/**
 * Given a current value and usage-counts, return a different allowed value
 * if the current is the most-used (or tied for most). Returns the original
 * when history has no reason to rotate.
 */
export function pickLeastUsed(
  field: string,
  currentValue: string,
  counts: UsageCounts,
  allowedValues: readonly string[],
  logTag?: string,
): string {
  const fieldCounts = counts[field];
  if (!fieldCounts || Object.keys(fieldCounts).length === 0) return currentValue;

  const currentCount = fieldCounts[currentValue] || 0;
  const maxCount = Math.max(...Object.values(fieldCounts));

  // Only rotate when the current value is the (tied) most-used
  if (currentCount < maxCount) return currentValue;

  let minCount = Infinity;
  for (const val of allowedValues) {
    const count = fieldCounts[val] || 0;
    if (count < minCount) minCount = count;
  }

  const leastUsed = allowedValues.filter(val => (fieldCounts[val] || 0) === minCount);
  if (leastUsed.length === 0) return currentValue;

  const picked = leastUsed[Math.floor(Math.random() * leastUsed.length)];

  if (picked !== currentValue && logTag) {
    console.log(`[${logTag}] History rotation: ${field} "${currentValue}" (${currentCount}x) → "${picked}" (${minCount}x)`);
  }

  return picked;
}

/**
 * Convenience: iterate every (field, allowedValues) pair and rotate the
 * current tokens in place if the current value is over-used. Handles
 * dotted-path fields like `bold.headerLayout` / `editorial.grid`.
 *
 * This is THE place where the experimental/creative variation bug gets
 * fixed — each expert passes its own level-specific pools.
 */
export function rotateLeastUsed(
  tokens: CVDesignTokens,
  history: CVDesignTokens[] | undefined,
  fieldPools: Record<string, readonly string[]>,
  logTag: string,
): void {
  if (!history || history.length === 0) return;

  const trackedFields = Object.keys(fieldPools);
  const counts = buildUsageCounts(history, trackedFields);

  for (const field of trackedFields) {
    const current = getAtPath(tokens, field);
    if (!current) continue;
    const rotated = pickLeastUsed(field, current, counts, fieldPools[field], logTag);
    if (rotated !== current) {
      setAtPath(tokens as unknown as Record<string, unknown>, field, rotated);
    }
  }
}

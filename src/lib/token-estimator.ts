/**
 * Token Estimator Utility
 * Estimates token counts for various input types to help users understand costs before API calls
 */

import type { ProfileInputSource } from '@/types';
import type { ModelInfo } from '@/lib/ai/models-registry';

export interface TokenEstimate {
  estimatedTokens: number;
  estimatedCost: number; // in USD
  breakdown: {
    text: number;
    images: number;
    pdfs: number;
    systemPrompt: number;
  };
}

// Average tokens for the extraction prompt
const SYSTEM_PROMPT_TOKENS = 200;

// Token estimation constants
const CHARS_PER_TOKEN = 4; // Average characters per token for text

// Image token estimates based on typical dimensions
// These are approximations based on common AI model pricing
const IMAGE_TOKEN_ESTIMATES = {
  small: 85,    // Small images or low detail (< 512x512)
  medium: 765,  // Medium images (512x512 to 1024x1024)
  large: 1105,  // Large images (> 1024x1024)
};

// PDF token estimates per page
// PDFs are converted to images - most APIs use medium resolution
// Realistic estimate based on actual API behavior
const PDF_TOKENS_PER_PAGE = 1000; // More realistic estimate

// Bytes per PDF page - typical PDF pages are 100-300KB due to compression
const PDF_BYTES_PER_PAGE = 150000; // 150KB per page (was 50KB)

/**
 * Estimate tokens for a text string
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate tokens for an image based on base64 size
 * Most AI APIs process images at standard resolutions
 * Token costs are relatively fixed regardless of original file size
 */
export function estimateImageTokens(base64Size: number): number {
  // Rough estimation based on base64 size
  // base64 is ~33% larger than the original file
  const estimatedFileSize = base64Size * 0.75;

  // Small images (< 200KB) - typically processed at low detail
  if (estimatedFileSize < 200000) {
    return IMAGE_TOKEN_ESTIMATES.small;
  }
  // Medium images (200KB - 1MB)
  if (estimatedFileSize < 1000000) {
    return IMAGE_TOKEN_ESTIMATES.medium;
  }
  // Large images (> 1MB)
  return IMAGE_TOKEN_ESTIMATES.large;
}

/**
 * Estimate tokens for a PDF based on base64 size
 * PDFs are converted to images by most AI APIs
 */
export function estimatePdfTokens(base64Size: number): number {
  // Rough estimation based on base64 size
  const estimatedFileSize = base64Size * 0.75;

  // Estimate pages - typical PDF pages are 100-300KB compressed
  // Using 150KB as average to avoid over-estimation
  const estimatedPages = Math.max(1, Math.ceil(estimatedFileSize / PDF_BYTES_PER_PAGE));

  return estimatedPages * PDF_TOKENS_PER_PAGE;
}

/**
 * Estimate total tokens for a list of profile input sources
 */
export function estimateSourcesTokens(sources: ProfileInputSource[]): {
  total: number;
  breakdown: TokenEstimate['breakdown'];
} {
  let textTokens = 0;
  let imageTokens = 0;
  let pdfTokens = 0;

  for (const source of sources) {
    if (source.type === 'text' && source.text) {
      textTokens += estimateTextTokens(source.text);
    } else if (source.type === 'file' && source.file) {
      const base64Size = source.file.base64.length;

      if (source.file.mediaType === 'application/pdf') {
        pdfTokens += estimatePdfTokens(base64Size);
      } else if (source.file.mediaType.startsWith('image/')) {
        imageTokens += estimateImageTokens(base64Size);
      }
    }
  }

  return {
    total: textTokens + imageTokens + pdfTokens + SYSTEM_PROMPT_TOKENS,
    breakdown: {
      text: textTokens,
      images: imageTokens,
      pdfs: pdfTokens,
      systemPrompt: SYSTEM_PROMPT_TOKENS,
    },
  };
}

/**
 * Calculate estimated cost based on token count and model pricing
 */
export function calculateEstimatedCost(
  inputTokens: number,
  modelInfo: ModelInfo | null
): number {
  if (!modelInfo?.pricing) {
    // Default to GPT-4o pricing if no model info available
    return (inputTokens / 1_000_000) * 2.5;
  }

  // Input cost + estimated output cost (assume output is ~1000 tokens for profile extraction)
  const inputCost = (inputTokens / 1_000_000) * modelInfo.pricing.input;
  const estimatedOutputTokens = 1000; // Typical output for profile extraction
  const outputCost = (estimatedOutputTokens / 1_000_000) * modelInfo.pricing.output;

  return inputCost + outputCost;
}

/**
 * Get a complete token estimate for profile input sources
 */
export function getTokenEstimate(
  sources: ProfileInputSource[],
  modelInfo: ModelInfo | null
): TokenEstimate {
  const { total, breakdown } = estimateSourcesTokens(sources);
  const estimatedCost = calculateEstimatedCost(total, modelInfo);

  return {
    estimatedTokens: total,
    estimatedCost,
    breakdown,
  };
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `~${tokens}`;
  }
  return `~${(tokens / 1000).toFixed(1)}k`;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `<$0.01`;
  }
  return `~$${cost.toFixed(2)}`;
}

/**
 * Check if token count exceeds warning threshold
 */
export function exceedsWarningThreshold(tokens: number, threshold = 20000): boolean {
  return tokens > threshold;
}

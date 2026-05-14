import type { Timestamp } from 'firebase/firestore';

// Now supports any provider from models.dev
export type LLMProvider = string;

// LLM mode: own API key or platform-provided AI
export type LLMMode = 'own-key' | 'platform';

// User roles for access control
export type UserRole = 'user' | 'admin';

export interface UserApiKey {
  provider: string;
  encryptedKey: string;
  model: string;
}

export interface UserCredits {
  free: number;           // Monthly free credits (resets to 10 each month)
  purchased: number;      // Purchased credits (never expires, accumulates)
  lastFreeReset: Timestamp;

  // Deprecated: kept for backward compatibility during migration
  balance?: number;
}

export interface User {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  apiKey: UserApiKey | null;
  llmMode?: LLMMode;                // 'own-key' (default) or 'platform'
  credits: UserCredits;
  role: UserRole;                    // User role (defaults to 'user')
  disabled?: boolean;                // Account disabled by admin
  disabledAt?: Timestamp;            // When the account was disabled
  disabledReason?: string;           // Reason for disabling
  assignedTemplates?: string[];      // IDs from globalTemplates collection
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ Transaction Types ============

export type TransactionType =
  | 'monthly_free'
  | 'purchase'
  | 'cv_generation'
  | 'refund'
  | 'platform_ai'
  | 'platform_ai_refund';

export interface CreditTransaction {
  id?: string;
  amount: number;
  type: TransactionType;
  description: string;
  molliePaymentId: string | null;
  cvId: string | null;
  createdAt: Timestamp;
}

// ============ Token Usage Types ============

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface TokenCost {
  input: number;   // USD
  output: number;  // USD
  total: number;   // USD
}

export interface StepTokenUsage {
  step: 'profile-parse' | 'profile-enrich' | 'linkedin-export' | 'job' | 'style' | 'generate' | 'regenerate' | 'motivation';
  usage: TokenUsage;
  cost: TokenCost;
  modelId: string;
  timestamp: Date;
}

import type { Timestamp } from 'firebase/firestore';
import type { StyleCreativityLevel } from './cv-style';

export type DisputeStatus =
  | 'pending-ai'        // Gatekeeper is evaluating
  | 'approved'          // Gatekeeper or admin agreed — CV was regenerated in a new style
  | 'rejected'          // Gatekeeper / admin rejected — CV stays as-is
  | 'needs-human';      // Third attempt — waiting for admin review

export interface CVDispute {
  id?: string;
  cvId: string;
  userId: string;
  userEmail?: string;
  // What the user said was wrong. Minimum length enforced by the API (20 chars).
  reason: string;
  // Where we came from / where we went to. requestedLevel is the user's pick.
  previousLevel: StyleCreativityLevel;
  requestedLevel: StyleCreativityLevel;
  // Gatekeeper outcome (absent when status is needs-human and not yet resolved).
  aiVerdict?: 'approved' | 'rejected';
  aiRationale?: string;
  // Admin outcome (only set when status was needs-human).
  adminVerdict?: 'approved' | 'rejected';
  adminRationale?: string;
  adminUserId?: string;
  status: DisputeStatus;
  // Attempt number within this CV's dispute lifecycle (1-3).
  attempt: number;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

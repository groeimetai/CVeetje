export type FeedbackType = 'feature_request' | 'bug_report' | 'general_feedback';

export type FeedbackStatus = 'new' | 'in_review' | 'planned' | 'in_progress' | 'resolved' | 'declined';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackCategory = 'ux' | 'performance' | 'content' | 'other';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  title: string;
  imageUrls: string[];
  // Feature Request
  description?: string;
  priority?: FeedbackPriority;
  useCase?: string;
  expectedBehavior?: string;
  // Bug Report
  stepsToReproduce?: string;
  actualBehavior?: string;
  browserInfo?: string;
  severity?: FeedbackPriority;
  // General Feedback
  message?: string;
  category?: FeedbackCategory;
  // Admin
  adminNotes?: string;
  // GitHub
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

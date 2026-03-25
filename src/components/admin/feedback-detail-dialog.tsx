'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ExternalLink, Send, MessageCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FeedbackItem, FeedbackStatus } from '@/types';

interface GitHubComment {
  id: number;
  body: string;
  author: string;
  avatarUrl: string;
  createdAt: string;
}

interface FeedbackDetailDialogProps {
  feedback: FeedbackItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const STATUSES: FeedbackStatus[] = ['new', 'in_review', 'planned', 'in_progress', 'resolved', 'declined'];

export function FeedbackDetailDialog({ feedback, open, onOpenChange, onUpdate }: FeedbackDetailDialogProps) {
  const t = useTranslations('admin.feedback');
  const tf = useTranslations('feedback');
  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // GitHub comments
  const [comments, setComments] = useState<GitHubComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setAdminNotes(feedback.adminNotes || '');
      setComments([]);
      setNewComment('');
    }
  }, [feedback]);

  const fetchComments = useCallback(async () => {
    if (!feedback?.githubIssueNumber) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/feedback/${feedback.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } finally {
      setLoadingComments(false);
    }
  }, [feedback?.id, feedback?.githubIssueNumber]);

  useEffect(() => {
    if (open && feedback?.githubIssueNumber) {
      fetchComments();
    }
  }, [open, fetchComments, feedback?.githubIssueNumber]);

  if (!feedback) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) {
        onUpdate();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/admin/feedback/${feedback.id}`, { method: 'DELETE' });
    if (res.ok) {
      onUpdate();
      onOpenChange(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/admin/feedback/${feedback.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{feedback.title}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{tf(`type.${feedback.type}`)}</Badge>
            <span>{feedback.userEmail}</span>
            <span>·</span>
            <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
            {feedback.githubIssueUrl && (
              <>
                <span>·</span>
                <a
                  href={feedback.githubIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Issue #{feedback.githubIssueNumber}
                </a>
              </>
            )}
          </div>

          {/* Type-specific fields */}
          {feedback.type === 'feature_request' && (
            <div className="space-y-3">
              {feedback.description && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.description')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.description}</p>
                </div>
              )}
              {feedback.priority && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.priority')}</Label>
                  <p className="mt-1"><Badge variant="outline">{tf(`priority.${feedback.priority}`)}</Badge></p>
                </div>
              )}
              {feedback.useCase && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.useCase')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.useCase}</p>
                </div>
              )}
              {feedback.expectedBehavior && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.expectedBehavior')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.expectedBehavior}</p>
                </div>
              )}
            </div>
          )}

          {feedback.type === 'bug_report' && (
            <div className="space-y-3">
              {feedback.stepsToReproduce && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.stepsToReproduce')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.stepsToReproduce}</p>
                </div>
              )}
              {feedback.expectedBehavior && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.expectedBehavior')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.expectedBehavior}</p>
                </div>
              )}
              {feedback.actualBehavior && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.actualBehavior')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.actualBehavior}</p>
                </div>
              )}
              {feedback.severity && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.severity')}</Label>
                  <p className="mt-1"><Badge variant="outline">{tf(`priority.${feedback.severity}`)}</Badge></p>
                </div>
              )}
              {feedback.browserInfo && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.browserInfo')}</Label>
                  <p className="mt-1 text-xs text-muted-foreground break-all">{feedback.browserInfo}</p>
                </div>
              )}
            </div>
          )}

          {feedback.type === 'general_feedback' && (
            <div className="space-y-3">
              {feedback.message && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.message')}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{feedback.message}</p>
                </div>
              )}
              {feedback.category && (
                <div>
                  <Label className="text-muted-foreground">{tf('form.category')}</Label>
                  <p className="mt-1"><Badge variant="outline">{tf(`category.${feedback.category}`)}</Badge></p>
                </div>
              )}
            </div>
          )}

          {/* Images */}
          {feedback.imageUrls?.length > 0 && (
            <div>
              <Label className="text-muted-foreground">{t('images')}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {feedback.imageUrls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Attachment ${i + 1}`}
                      className="max-h-40 rounded-lg border object-contain hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Comments */}
          {feedback.githubIssueNumber && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-muted-foreground" />
                <Label>GitHub Comments</Label>
              </div>

              {loadingComments ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No comments yet</p>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={comment.avatarUrl}
                          alt={comment.author}
                          className="size-5 rounded-full"
                        />
                        <span className="text-xs font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Post comment */}
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment to the GitHub issue..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || postingComment}
                >
                  {postingComment ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Admin controls */}
          <div className="border-t pt-4 space-y-3">
            <div className="space-y-2">
              <Label>{t('updateStatus')}</Label>
              <Select value={status} onValueChange={v => setStatus(v as FeedbackStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{tf(`status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('adminNotes')}</Label>
              <Textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder={t('adminNotesPlaceholder')}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="mr-auto"
          >
            {t('delete')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '...' : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

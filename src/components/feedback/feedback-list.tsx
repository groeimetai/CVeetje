'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Lightbulb, Bug, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { FeedbackStatusBadge } from './feedback-status-badge';
import type { FeedbackItem, FeedbackType } from '@/types';

const TYPE_ICONS: Record<FeedbackType, typeof Lightbulb> = {
  feature_request: Lightbulb,
  bug_report: Bug,
  general_feedback: MessageCircle,
};

interface FeedbackListProps {
  refreshKey: number;
}

export function FeedbackList({ refreshKey }: FeedbackListProps) {
  const t = useTranslations('feedback');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/feedback');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('form.submitError'));
      }
      const data = await res.json();
      setItems(data.feedback || []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : t('form.submitError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('myFeedback')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full size-6 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('noFeedback')}</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const TypeIcon = TYPE_ICONS[item.type];
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-3"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <TypeIcon className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`type.${item.type}`)} · {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <FeedbackStatusBadge status={item.status} />
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                      {/* Type-specific fields */}
                      {item.type === 'feature_request' && (
                        <>
                          {item.description && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.description')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.description}</p>
                            </div>
                          )}
                          {item.priority && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.priority')}:</span>{' '}
                              <Badge variant="outline">{t(`priority.${item.priority}`)}</Badge>
                            </div>
                          )}
                          {item.useCase && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.useCase')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.useCase}</p>
                            </div>
                          )}
                          {item.expectedBehavior && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.expectedBehavior')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.expectedBehavior}</p>
                            </div>
                          )}
                        </>
                      )}
                      {item.type === 'bug_report' && (
                        <>
                          {item.stepsToReproduce && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.stepsToReproduce')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.stepsToReproduce}</p>
                            </div>
                          )}
                          {item.expectedBehavior && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.expectedBehavior')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.expectedBehavior}</p>
                            </div>
                          )}
                          {item.actualBehavior && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.actualBehavior')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.actualBehavior}</p>
                            </div>
                          )}
                          {item.severity && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.severity')}:</span>{' '}
                              <Badge variant="outline">{t(`priority.${item.severity}`)}</Badge>
                            </div>
                          )}
                        </>
                      )}
                      {item.type === 'general_feedback' && (
                        <>
                          {item.message && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.message')}:</span>
                              <p className="mt-0.5 whitespace-pre-wrap">{item.message}</p>
                            </div>
                          )}
                          {item.category && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t('form.category')}:</span>{' '}
                              <Badge variant="outline">{t(`category.${item.category}`)}</Badge>
                            </div>
                          )}
                        </>
                      )}

                      {/* Images */}
                      {item.imageUrls?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {item.imageUrls.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={`Screenshot ${i + 1}`}
                                className="size-16 rounded border object-cover hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Delete (only for 'new' status) */}
                      {item.status === 'new' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          {t('delete')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { KanbanCard, KanbanTag } from '@/types';

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard | null; // null = create mode
  tags: KanbanTag[];
  onSave: (data: { title: string; description: string; tagIds: string[] }) => void;
  onDelete?: (cardId: string) => void;
}

export function CardDialog({ open, onOpenChange, card, tags, onSave, onDelete }: CardDialogProps) {
  const t = useTranslations('admin.kanban');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(card?.title || '');
      setDescription(card?.description || '');
      setSelectedTagIds(card?.tagIds || []);
    }
  }, [open, card]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), tagIds: selectedTagIds });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? t('card.editCard') : t('card.newCard')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">{t('card.title')}</Label>
            <Input
              id="card-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('card.titlePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-description">{t('card.description')}</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('card.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>{t('card.tags')}</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      selectedTagIds.includes(tag.id)
                        ? 'text-white scale-105'
                        : 'text-white opacity-50 hover:opacity-75'
                    }`}
                    style={{
                      backgroundColor: tag.color,
                      boxShadow: selectedTagIds.includes(tag.id)
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${tag.color}`
                        : undefined,
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {card && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(card.id);
                  onOpenChange(false);
                }}
                className="mr-auto"
              >
                {t('card.delete')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? '...' : card ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

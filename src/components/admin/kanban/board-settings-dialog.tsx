'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { KanbanColumn, KanbanTag } from '@/types';

const COLOR_PRESETS = [
  '#9CA3AF', // grey
  '#3B82F6', // blue
  '#EAB308', // yellow
  '#5F6F4E', // olive
  '#EF4444', // red
  '#8B5CF6', // purple
  '#F97316', // orange
  '#EC4899', // pink
  '#14B8A6', // teal
  '#881337', // burgundy
];

interface BoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: KanbanColumn[];
  tags: KanbanTag[];
  onSave: (data: {
    title: string;
    description: string;
    columns: KanbanColumn[];
    tags: KanbanTag[];
  }) => void;
}

export function BoardSettingsDialog({
  open,
  onOpenChange,
  title: initialTitle,
  description: initialDescription,
  columns: initialColumns,
  tags: initialTags,
  onSave,
}: BoardSettingsDialogProps) {
  const t = useTranslations('admin.kanban');
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [tags, setTags] = useState<KanbanTag[]>(initialTags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setColumns(initialColumns);
      setTags(initialTags);
    }
  }, [open, initialTitle, initialDescription, initialColumns, initialTags]);

  const addColumn = () => {
    setColumns(prev => [
      ...prev,
      {
        id: `col_${Date.now()}`,
        title: '',
        color: COLOR_PRESETS[prev.length % COLOR_PRESETS.length],
        order: prev.length,
      },
    ]);
  };

  const removeColumn = (id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i })));
  };

  const updateColumn = (id: string, field: 'title' | 'color', value: string) => {
    setColumns(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addTag = () => {
    setTags(prev => [
      ...prev,
      {
        id: `tag_${Date.now()}`,
        label: '',
        color: COLOR_PRESETS[prev.length % COLOR_PRESETS.length],
      },
    ]);
  };

  const removeTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const updateTag = (id: string, field: 'label' | 'color', value: string) => {
    setTags(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        columns: columns.filter(c => c.title.trim()),
        tags: tags.filter(t => t.label.trim()),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Board info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="board-title">{t('boardTitle')}</Label>
              <Input
                id="board-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-desc">{t('boardDescription')}</Label>
              <Textarea
                id="board-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Columns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('columns')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                <Plus className="mr-1 size-3.5" />
                {t('addColumn')}
              </Button>
            </div>
            <div className="space-y-2">
              {columns.map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColumn(col.id, 'color', color)}
                        className={`size-5 rounded-full transition-all ${
                          col.color === color ? 'ring-2 ring-offset-1 ring-offset-background ring-foreground scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    value={col.title}
                    onChange={e => updateColumn(col.id, 'title', e.target.value)}
                    placeholder={t('columnName')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColumn(col.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('tags')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="mr-1 size-3.5" />
                {t('addTag')}
              </Button>
            </div>
            <div className="space-y-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateTag(tag.id, 'color', color)}
                        className={`size-5 rounded-full transition-all ${
                          tag.color === color ? 'ring-2 ring-offset-1 ring-offset-background ring-foreground scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    value={tag.label}
                    onChange={e => updateTag(tag.id, 'label', e.target.value)}
                    placeholder={t('tagLabel')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  {t('addTag')}...
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? '...' : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

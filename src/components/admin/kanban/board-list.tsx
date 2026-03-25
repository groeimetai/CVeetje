'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { KanbanBoard } from '@/types';

export function BoardList() {
  const t = useTranslations('admin.kanban');
  const router = useRouter();

  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/admin/kanban/boards');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBoards(data.boards);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/kanban/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreateOpen(false);
        setNewTitle('');
        setNewDescription('');
        router.push(`/admin/kanban/${data.board.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (boardId: string) => {
    setDeletingId(boardId);
    try {
      const res = await fetch(`/api/admin/kanban/boards/${boardId}`, { method: 'DELETE' });
      if (res.ok) {
        setBoards(prev => prev.filter(b => b.id !== boardId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          {t('newBoard')}
        </Button>
      </div>

      {boards.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          {t('noBoards')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(board => (
            <div
              key={board.id}
              className="group relative cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => router.push(`/admin/kanban/${board.id}`)}
            >
              {/* Column color bar */}
              <div className="mb-3 flex gap-1">
                {board.columns.map(col => (
                  <div
                    key={col.id}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                ))}
              </div>

              <h3 className="text-lg font-semibold">{board.title}</h3>
              {board.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {board.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('cards', { count: board.cardCount })}</span>
                <span>{board.columns.length} kolommen</span>
              </div>

              {/* Tags preview */}
              {board.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {board.tags.slice(0, 5).map(tag => (
                    <span
                      key={tag.id}
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.label}
                    </span>
                  ))}
                  {board.tags.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{board.tags.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Delete button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (confirm(t('deleteBoardConfirm', { title: board.title }))) {
                    handleDelete(board.id);
                  }
                }}
                disabled={deletingId === board.id}
                className="absolute top-3 right-3 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newBoard')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-board-title">{t('boardTitle')}</Label>
              <Input
                id="new-board-title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={t('boardTitlePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-board-desc">{t('boardDescription')}</Label>
              <Textarea
                id="new-board-desc"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder={t('boardDescriptionPlaceholder')}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!newTitle.trim() || creating}>
                {creating ? '...' : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

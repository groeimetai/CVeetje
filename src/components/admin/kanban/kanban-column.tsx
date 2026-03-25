'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { KanbanCard } from './kanban-card';
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType, KanbanTag } from '@/types';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  tags: KanbanTag[];
  onAddCard: (columnId: string) => void;
  onEditCard: (card: KanbanCardType) => void;
  onDeleteCard: (cardId: string) => void;
}

export function KanbanColumn({ column, cards, tags, onAddCard, onEditCard, onDeleteCard }: KanbanColumnProps) {
  const t = useTranslations('admin.kanban');
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  });

  const cardIds = cards.map(c => c.id);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[350px] w-full">
      <div
        className="rounded-t-lg border-t-[3px] px-3 py-2 flex items-center justify-between"
        style={{ borderTopColor: column.color }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 rounded-b-lg border border-t-0 p-2 min-h-[100px] transition-colors ${
            isOver ? 'bg-accent/50' : 'bg-muted/30'
          }`}
        >
          {cards.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">{t('empty')}</p>
          ) : (
            cards.map(card => (
              <KanbanCard
                key={card.id}
                card={card}
                tags={tags}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

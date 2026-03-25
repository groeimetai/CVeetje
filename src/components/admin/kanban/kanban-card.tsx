'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { KanbanCard as KanbanCardType, KanbanTag } from '@/types';

interface KanbanCardProps {
  card: KanbanCardType;
  tags: KanbanTag[];
  onEdit: (card: KanbanCardType) => void;
  onDelete: (cardId: string) => void;
  isOverlay?: boolean;
}

export function KanbanCard({ card, tags, onEdit, onDelete, isOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardTags = tags.filter(t => card.tagIds.includes(t.id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow ${
        isOverlay ? 'rotate-2 opacity-90 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{card.title}</p>
          {card.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              {card.description}
            </p>
          )}
          {cardTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {cardTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(card)}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

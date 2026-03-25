'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Settings } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { CardDialog } from './card-dialog';
import { BoardSettingsDialog } from './board-settings-dialog';
import type {
  KanbanBoard as KanbanBoardType,
  KanbanCard as KanbanCardType,
  KanbanColumn as KanbanColumnType,
  KanbanTag,
} from '@/types';

interface KanbanBoardProps {
  boardId: string;
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const t = useTranslations('admin.kanban');

  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // DnD state
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);

  // Dialogs
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCardType | null>(null);
  const [addingToColumnId, setAddingToColumnId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mobile tab
  const [activeTab, setActiveTab] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/kanban/boards/${boardId}`);
      if (!res.ok) throw new Error('Failed to fetch board');
      const data = await res.json();
      setBoard(data.board);
      setCards(data.cards);
      if (data.board.columns.length > 0 && !activeTab) {
        setActiveTab(data.board.columns[0].id);
      }
    } catch {
      setError('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId, activeTab]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const getCardsByColumn = useCallback(
    (columnId: string) =>
      cards
        .filter(c => c.columnId === columnId)
        .sort((a, b) => a.order - b.order),
    [cards]
  );

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let overColumnId: string | null = null;

    if (overId.startsWith('column-')) {
      overColumnId = overId.replace('column-', '');
    } else {
      // Over another card - find its column
      const overCard = cards.find(c => c.id === overId);
      if (overCard) overColumnId = overCard.columnId;
    }

    if (!overColumnId) return;

    const activeCardData = cards.find(c => c.id === activeCardId);
    if (!activeCardData || activeCardData.columnId === overColumnId) return;

    // Move card to new column (optimistic)
    setCards(prev =>
      prev.map(c =>
        c.id === activeCardId ? { ...c, columnId: overColumnId! } : c
      )
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const activeCardData = cards.find(c => c.id === activeCardId);
    if (!activeCardData) return;

    let targetColumnId = activeCardData.columnId;
    if (overId.startsWith('column-')) {
      targetColumnId = overId.replace('column-', '');
    } else {
      const overCard = cards.find(c => c.id === overId);
      if (overCard) targetColumnId = overCard.columnId;
    }

    // Get cards in the target column
    const columnCards = cards
      .filter(c => c.columnId === targetColumnId)
      .sort((a, b) => a.order - b.order);

    // If dropping on another card, reorder within column
    let newCards = [...cards];
    if (!overId.startsWith('column-') && overId !== activeCardId) {
      const oldIndex = columnCards.findIndex(c => c.id === activeCardId);
      const newIndex = columnCards.findIndex(c => c.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnCards, oldIndex, newIndex);
        const orderMap = new Map(reordered.map((c, i) => [c.id, i]));
        newCards = newCards.map(c =>
          orderMap.has(c.id)
            ? { ...c, columnId: targetColumnId, order: orderMap.get(c.id)! }
            : c
        );
      }
    }

    // Ensure the active card is in the right column
    newCards = newCards.map(c =>
      c.id === activeCardId ? { ...c, columnId: targetColumnId } : c
    );

    const prevCards = cards;
    setCards(newCards);

    // Build updates for API
    const updatedColumnCards = newCards
      .filter(c => c.columnId === targetColumnId)
      .sort((a, b) => a.order - b.order);
    const updates = updatedColumnCards.map((c, i) => ({
      cardId: c.id,
      columnId: targetColumnId,
      order: i,
    }));

    try {
      const res = await fetch('/api/admin/kanban/cards/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback on failure
      setCards(prevCards);
    }
  };

  // Card CRUD
  const handleAddCard = (columnId: string) => {
    setEditingCard(null);
    setAddingToColumnId(columnId);
    setCardDialogOpen(true);
  };

  const handleEditCard = (card: KanbanCardType) => {
    setEditingCard(card);
    setAddingToColumnId(null);
    setCardDialogOpen(true);
  };

  const handleSaveCard = async (data: { title: string; description: string; tagIds: string[] }) => {
    if (editingCard) {
      // Update existing card
      const res = await fetch(`/api/admin/kanban/cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setCards(prev =>
          prev.map(c => (c.id === editingCard.id ? { ...c, ...data } : c))
        );
      }
    } else if (addingToColumnId) {
      // Create new card
      const res = await fetch('/api/admin/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, columnId: addingToColumnId, ...data }),
      });
      if (res.ok) {
        const result = await res.json();
        setCards(prev => [...prev, result.card]);
        setBoard(prev => prev ? { ...prev, cardCount: prev.cardCount + 1 } : prev);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const prevCards = cards;
    setCards(prev => prev.filter(c => c.id !== cardId));
    setBoard(prev => prev ? { ...prev, cardCount: Math.max(0, prev.cardCount - 1) } : prev);

    try {
      const res = await fetch(`/api/admin/kanban/cards/${cardId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setCards(prevCards);
    }
  };

  // Board settings
  const handleSaveSettings = async (data: {
    title: string;
    description: string;
    columns: KanbanColumnType[];
    tags: KanbanTag[];
  }) => {
    const res = await fetch(`/api/admin/kanban/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setBoard(prev => (prev ? { ...prev, ...data } : prev));
      // Refresh to get updated card counts after potential column deletions
      fetchBoard();
    }
  };

  const columns = useMemo(
    () => (board?.columns || []).sort((a, b) => a.order - b.order),
    [board?.columns]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        {error || 'Board not found'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/kanban">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 size-4" />
              {t('backToBoards')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{board.title}</h1>
            {board.description && (
              <p className="text-sm text-muted-foreground">{board.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="mr-1 size-4" />
          {t('settings')}
        </Button>
      </div>

      {/* Board - Desktop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop grid */}
        <div
          className="hidden md:grid gap-4 overflow-x-auto pb-4"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
          }}
        >
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={getCardsByColumn(col.id)}
              tags={board.tags}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
            />
          ))}
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden">
          {columns.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {columns.map(col => (
                  <TabsTrigger key={col.id} value={col.id} className="text-xs">
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.title}
                    <span className="ml-1 text-muted-foreground">
                      ({getCardsByColumn(col.id).length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {columns.map(col => (
                <TabsContent key={col.id} value={col.id}>
                  <KanbanColumn
                    column={col}
                    cards={getCardsByColumn(col.id)}
                    tags={board.tags}
                    onAddCard={handleAddCard}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            <KanbanCard
              card={activeCard}
              tags={board.tags}
              onEdit={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <CardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        card={editingCard}
        tags={board.tags}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />
      <BoardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title={board.title}
        description={board.description}
        columns={board.columns}
        tags={board.tags}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

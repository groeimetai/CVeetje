'use client';

import { use } from 'react';
import { KanbanBoard } from '@/components/admin/kanban/kanban-board';

export default function KanbanBoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);

  return <KanbanBoard boardId={boardId} />;
}

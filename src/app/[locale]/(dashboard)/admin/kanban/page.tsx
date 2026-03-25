'use client';

import { useTranslations } from 'next-intl';
import { BoardList } from '@/components/admin/kanban/board-list';

export default function AdminKanbanPage() {
  const t = useTranslations('admin.kanban');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <BoardList />
    </div>
  );
}

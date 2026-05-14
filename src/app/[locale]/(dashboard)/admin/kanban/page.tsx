'use client';

import { useTranslations } from 'next-intl';
import { BoardList } from '@/components/admin/kanban/board-list';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminKanbanPage() {
  const t = useTranslations('admin.kanban');

  return (
    <>
      <PageHeader
        eyebrow="§ Interne planning"
        title={<>Kanban <em>boards</em></>}
        subtitle={t('description')}
      />
      <BoardList />
    </>
  );
}

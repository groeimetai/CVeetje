'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Lightbulb, Bug, MessageCircle } from 'lucide-react';
import { FeedbackStatusBadge } from '@/components/feedback/feedback-status-badge';
import { FeedbackDetailDialog } from './feedback-detail-dialog';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '@/types';

const TYPE_ICONS: Record<FeedbackType, typeof Lightbulb> = {
  feature_request: Lightbulb,
  bug_report: Bug,
  general_feedback: MessageCircle,
};

export function FeedbackSection() {
  const t = useTranslations('admin.feedback');
  const tf = useTranslations('feedback');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feedback?limit=200');
      if (res.ok) {
        const data = await res.json();
        setItems(data.feedback);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filtered = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.userEmail.toLowerCase().includes(q) ||
        (item.userDisplayName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    new: items.filter(i => i.status === 'new').length,
    inReview: items.filter(i => i.status === 'in_review').length,
    resolved: items.filter(i => i.status === 'resolved').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t('statsTotal', { count: stats.total })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{stats.new}</p>
            <p className="text-xs text-muted-foreground">{t('statsNew', { count: stats.new })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{stats.inReview}</p>
            <p className="text-xs text-muted-foreground">{t('statsInReview', { count: stats.inReview })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">{t('statsResolved', { count: stats.resolved })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search')}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            <SelectItem value="feature_request">{tf('type.feature_request')}</SelectItem>
            <SelectItem value="bug_report">{tf('type.bug_report')}</SelectItem>
            <SelectItem value="general_feedback">{tf('type.general_feedback')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {(['new', 'in_review', 'planned', 'in_progress', 'resolved', 'declined'] as FeedbackStatus[]).map(s => (
              <SelectItem key={s} value={s}>{tf(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('noFeedback')}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.type')}</TableHead>
                <TableHead>{t('table.user')}</TableHead>
                <TableHead>{t('table.title')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const TypeIcon = TYPE_ICONS[item.type];
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="size-3.5 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px]">
                          {tf(`type.${item.type}`)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.userDisplayName || item.userEmail}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[300px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <FeedbackStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <FeedbackDetailDialog
        feedback={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchFeedback}
      />
    </div>
  );
}

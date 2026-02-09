'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  ArrowDownUp,
  Loader2,
  Mail,
  RefreshCw,
  Search,
} from 'lucide-react';
import { EmailDetailDialog } from '@/components/admin/email-detail-dialog';
import type { AdminEmail } from '@/app/api/admin/emails/route';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  ERROR: 'destructive',
  PENDING: 'secondary',
  PROCESSING: 'secondary',
};

export function EmailsSection() {
  const t = useTranslations('admin.emails');
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<AdminEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEmails = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/emails?limit=200');

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Filter and sort emails
  useEffect(() => {
    let result = [...emails];

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(email => email.deliveryState === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(email => {
        const to = Array.isArray(email.to) ? email.to.join(', ') : email.to;
        return to?.toLowerCase().includes(query) ||
          email.subject?.toLowerCase().includes(query);
      });
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredEmails(result);
  }, [searchQuery, emails, statusFilter, sortOrder]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const getRecipient = (to: string | string[]) => {
    return Array.isArray(to) ? to.join(', ') : to;
  };

  const getStatusLabel = (state: string | null) => {
    if (!state) return t('statusPending');
    const map: Record<string, string> = {
      SUCCESS: t('statusSuccess'),
      ERROR: t('statusError'),
      PENDING: t('statusPending'),
      PROCESSING: t('statusProcessing'),
    };
    return map[state] || state;
  };

  // Calculate stats
  const stats = {
    total: emails.length,
    success: emails.filter(e => e.deliveryState === 'SUCCESS').length,
    error: emails.filter(e => e.deliveryState === 'ERROR').length,
    pending: emails.filter(e => !e.deliveryState || e.deliveryState === 'PENDING' || e.deliveryState === 'PROCESSING').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px] md:w-[250px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="SUCCESS">{t('statusSuccess')}</SelectItem>
                <SelectItem value="ERROR">{t('statusError')}</SelectItem>
                <SelectItem value="PENDING">{t('statusPending')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchEmails(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Badge variant="outline" className="text-xs">
              {t('statsTotal', { count: stats.total })}
            </Badge>
            {stats.success > 0 && (
              <Badge variant="default" className="text-xs">
                {t('statsSuccess', { count: stats.success })}
              </Badge>
            )}
            {stats.error > 0 && (
              <Badge variant="destructive" className="text-xs">
                {t('statsError', { count: stats.error })}
              </Badge>
            )}
            {stats.pending > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t('statsPending', { count: stats.pending })}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchEmails()}>
              {t('retry')}
            </Button>
          </div>
        ) : filteredEmails.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{t('noEmails')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.recipient')}</TableHead>
                  <TableHead>{t('table.subject')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      {t('table.date')}
                      <ArrowDownUp className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => (
                  <TableRow
                    key={email.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedEmail(email);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>
                      <span className="text-sm font-medium">
                        {getRecipient(email.to)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {email.subject || <span className="text-muted-foreground italic">{t('noSubject')}</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[email.deliveryState || ''] || 'outline'}>
                        {getStatusLabel(email.deliveryState)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(email.deliveryEndTime || email.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Email Detail Dialog */}
      <EmailDetailDialog
        email={selectedEmail}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

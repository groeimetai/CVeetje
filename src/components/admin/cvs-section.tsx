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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { AdminCVDialog } from '@/components/admin/admin-cv-dialog';
import type { AdminCV } from '@/lib/firebase/admin-utils';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  generated: 'default',
  pdf_ready: 'default',
  generating: 'secondary',
  draft: 'outline',
  failed: 'destructive',
};

export function CVsSection() {
  const t = useTranslations('admin.cvs');
  const tStatus = useTranslations('dashboard.status');
  const [cvs, setCvs] = useState<AdminCV[]>([]);
  const [filteredCvs, setFilteredCvs] = useState<AdminCV[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCV, setSelectedCV] = useState<AdminCV | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchCvs = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/cvs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch CVs');
      }

      const data = await response.json();
      setCvs(data.cvs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CVs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCvs();
  }, [fetchCvs]);

  // Unique users for filter dropdown
  const uniqueUsers = Array.from(
    new Map(cvs.map(cv => [cv.userId, { userId: cv.userId, label: cv.userDisplayName || cv.userEmail }])).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  // Filter and sort CVs
  useEffect(() => {
    let result = [...cvs];

    // User filter
    if (userFilter && userFilter !== 'all') {
      result = result.filter(cv => cv.userId === userFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cv =>
        cv.userEmail?.toLowerCase().includes(query) ||
        cv.userDisplayName?.toLowerCase().includes(query) ||
        cv.jobTitle?.toLowerCase().includes(query) ||
        cv.cvId.toLowerCase().includes(query)
      );
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredCvs(result);
    setPage(0);
  }, [searchQuery, cvs, userFilter, sortOrder]);

  const handleDelete = async (cvId: string, userId: string) => {
    try {
      const response = await fetch(`/api/admin/cvs/${cvId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      await fetchCvs(true);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDate = (date: string | Date) => {
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

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      generated: tStatus('generated'),
      pdf_ready: tStatus('ready'),
      generating: tStatus('generating'),
      draft: tStatus('draft'),
      failed: tStatus('failed'),
    };
    return statusMap[status] || status;
  };

  // Calculate stats
  const stats = {
    total,
    generated: cvs.filter(cv => cv.status === 'generated').length,
    pdfReady: cvs.filter(cv => cv.status === 'pdf_ready').length,
    draft: cvs.filter(cv => cv.status === 'draft').length,
    failed: cvs.filter(cv => cv.status === 'failed').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('allUsers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allUsers')}</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="draft">{tStatus('draft')}</SelectItem>
                <SelectItem value="generating">{tStatus('generating')}</SelectItem>
                <SelectItem value="generated">{tStatus('generated')}</SelectItem>
                <SelectItem value="pdf_ready">{tStatus('ready')}</SelectItem>
                <SelectItem value="failed">{tStatus('failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchCvs(true)}
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
            {stats.pdfReady > 0 && (
              <Badge variant="default" className="text-xs">
                {t('statsPdfReady', { count: stats.pdfReady })}
              </Badge>
            )}
            {stats.generated > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t('statsGenerated', { count: stats.generated })}
              </Badge>
            )}
            {stats.draft > 0 && (
              <Badge variant="outline" className="text-xs">
                {t('statsDraft', { count: stats.draft })}
              </Badge>
            )}
            {stats.failed > 0 && (
              <Badge variant="destructive" className="text-xs">
                {t('statsFailed', { count: stats.failed })}
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
            <Button variant="outline" className="mt-4" onClick={() => fetchCvs()}>
              {t('retry')}
            </Button>
          </div>
        ) : filteredCvs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{t('noCvs')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.user')}</TableHead>
                    <TableHead>{t('table.jobTitle')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.model')}</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      >
                        {t('table.created')}
                        <ArrowDownUp className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCvs.slice(page * pageSize, (page + 1) * pageSize).map((cv) => (
                    <TableRow
                      key={`${cv.userId}-${cv.cvId}`}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCV(cv);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {cv.userDisplayName || cv.userEmail}
                          </p>
                          {cv.userDisplayName && (
                            <p className="text-xs text-muted-foreground">{cv.userEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cv.jobTitle || <span className="text-muted-foreground italic">{t('generalCv')}</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[cv.status] || 'outline'}>
                          {getStatusLabel(cv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {cv.llmModel || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(cv.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCV(cv);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('deleteConfirm', { user: cv.userEmail })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cv.cvId, cv.userId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('pagination.rowsPerPage')}
                </span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('pagination.showing', {
                    from: page * pageSize + 1,
                    to: Math.min((page + 1) * pageSize, filteredCvs.length),
                    total: filteredCvs.length,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= filteredCvs.length}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* CV Preview Dialog */}
      <AdminCVDialog
        cv={selectedCV}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

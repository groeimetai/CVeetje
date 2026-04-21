'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Star,
  User as UserIcon,
} from 'lucide-react';
import { ProfileDetailDialog } from '@/components/admin/profile-detail-dialog';
import type { AdminProfileSummary } from '@/lib/firebase/admin-utils';

export function ProfilesSection() {
  const [profiles, setProfiles] = useState<AdminProfileSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [issuesFilter, setIssuesFilter] = useState<'all' | 'with' | 'without'>('all');
  const [selected, setSelected] = useState<AdminProfileSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProfiles = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/profiles?limit=500');
      if (!response.ok) throw new Error('Kon profielen niet ophalen');
      const data = await response.json();
      setProfiles(data.profiles || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const uniqueUsers = useMemo(() => {
    return Array.from(
      new Map(
        profiles.map(p => [
          p.userId,
          { userId: p.userId, label: p.userDisplayName || p.userEmail },
        ])
      ).values()
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles]);

  const filtered = useMemo(() => {
    let result = [...profiles];

    if (userFilter !== 'all') {
      result = result.filter(p => p.userId === userFilter);
    }

    if (issuesFilter === 'with') {
      result = result.filter(p => p.missingFields.length > 0);
    } else if (issuesFilter === 'without') {
      result = result.filter(p => p.missingFields.length === 0);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.userEmail.toLowerCase().includes(q) ||
        p.userDisplayName?.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.headline?.toLowerCase().includes(q) ||
        p.profileId.toLowerCase().includes(q)
      );
    }

    return result;
  }, [profiles, userFilter, issuesFilter, searchQuery]);

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

  const stats = {
    total,
    withIssues: profiles.filter(p => p.missingFields.length > 0).length,
    clean: profiles.filter(p => p.missingFields.length === 0).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Opgeslagen profielen
            </CardTitle>
            <CardDescription>
              Klik een rij voor de volledige ParsedLinkedIn-data. Ontbrekende
              velden zijn gemarkeerd zodat je snel ziet of een CV-issue uit het
              brondata komt.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op gebruiker, profiel of headline"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[260px]"
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle gebruikers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle gebruikers</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u.userId} value={u.userId}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={issuesFilter} onValueChange={(v) => setIssuesFilter(v as typeof issuesFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle profielen</SelectItem>
                <SelectItem value="with">Met ontbrekende velden</SelectItem>
                <SelectItem value="without">Compleet</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchProfiles(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {!loading && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Badge variant="outline" className="text-xs">Totaal: {stats.total}</Badge>
            {stats.withIssues > 0 && (
              <Badge variant="destructive" className="text-xs">
                Met issues: {stats.withIssues}
              </Badge>
            )}
            {stats.clean > 0 && (
              <Badge variant="default" className="text-xs">
                Compleet: {stats.clean}
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
            <Button variant="outline" className="mt-4" onClick={() => fetchProfiles()}>
              Opnieuw proberen
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Geen profielen gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Profielnaam</TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead className="text-center">Exp / Edu / Skills</TableHead>
                  <TableHead>Datakwaliteit</TableHead>
                  <TableHead>Bijgewerkt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const hasIssues = p.missingFields.length > 0;
                  return (
                    <TableRow
                      key={`${p.userId}-${p.profileId}`}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelected(p);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {p.userDisplayName || p.userEmail}
                          </p>
                          {p.userDisplayName && (
                            <p className="text-xs text-muted-foreground">{p.userEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.isDefault && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" aria-label="Standaard" />
                          )}
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {p.headline || <span className="italic">geen</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-mono text-muted-foreground">
                          {p.experienceCount} / {p.educationCount} / {p.skillsCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasIssues ? (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                            <span className="text-xs text-destructive line-clamp-1" title={p.missingFields.join(', ')}>
                              {p.missingFields.slice(0, 2).join(', ')}
                              {p.missingFields.length > 2 && ` +${p.missingFields.length - 2}`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs text-green-600">compleet</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ProfileDetailDialog
        summary={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Scale, CheckCircle2, XCircle } from 'lucide-react';
import type { AdminDisputeSummary } from '@/app/api/admin/disputes/route';
import type { DisputeStatus } from '@/types';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  'pending-ai': 'Wordt beoordeeld',
  'approved': 'Goedgekeurd',
  'rejected': 'Afgewezen',
  'needs-human': 'Wacht op admin',
};

const LEVEL_LABELS: Record<string, string> = {
  conservative: 'Veilig',
  balanced: 'Gebalanceerd',
  creative: 'Creatief',
  experimental: 'Experimenteel',
};

export function DisputesSection() {
  const [disputes, setDisputes] = useState<AdminDisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('needs-human');
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminDisputeSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveVerdict, setResolveVerdict] = useState<'approved' | 'rejected'>('approved');
  const [resolveRationale, setResolveRationale] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/disputes?status=${statusFilter}`);
      if (!response.ok) throw new Error('Kon disputes niet ophalen');
      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const stats = useMemo(() => ({
    total: disputes.length,
    pending: disputes.filter(d => d.status === 'needs-human').length,
    approved: disputes.filter(d => d.status === 'approved').length,
    rejected: disputes.filter(d => d.status === 'rejected').length,
  }), [disputes]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const openResolveDialog = (dispute: AdminDisputeSummary) => {
    setSelected(dispute);
    setResolveVerdict('approved');
    setResolveRationale('');
    setDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selected) return;
    if (resolveRationale.trim().length < 10) {
      setError('Rationale moet minstens 10 tekens bevatten');
      return;
    }
    setResolving(true);
    try {
      const response = await fetch(
        `/api/admin/disputes/${selected.userId}/${selected.disputeId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verdict: resolveVerdict, rationale: resolveRationale.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kon dispute niet afhandelen');
      setDialogOpen(false);
      await fetchDisputes(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setResolving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Dispute queue
            </CardTitle>
            <CardDescription>
              Handmatige beoordeling van 3e-lijns CV-disputes. Goedkeuren → CV
              wordt opnieuw gegenereerd. Afwijzen → CV blijft zoals hij is.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs-human">Wacht op admin</SelectItem>
                <SelectItem value="approved">Goedgekeurd</SelectItem>
                <SelectItem value="rejected">Afgewezen</SelectItem>
                <SelectItem value="all">Alles</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDisputes(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <Badge variant="outline">Totaal: {stats.total}</Badge>
            {stats.pending > 0 && <Badge variant="destructive">Wacht: {stats.pending}</Badge>}
            {stats.approved > 0 && <Badge variant="default">Goedgekeurd: {stats.approved}</Badge>}
            {stats.rejected > 0 && <Badge variant="secondary">Afgewezen: {stats.rejected}</Badge>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchDisputes()}>
              Opnieuw proberen
            </Button>
          </div>
        ) : disputes.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Geen disputes.</p>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <div
                key={d.disputeId}
                className="border rounded-md p-4 space-y-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">
                      {d.userDisplayName || d.userEmail || d.userId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.userEmail} · CV <span className="font-mono">{d.cvId.slice(0, 8)}</span> · poging {d.attempt}/3
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        d.status === 'needs-human' ? 'destructive' :
                        d.status === 'approved' ? 'default' :
                        'secondary'
                      }
                    >
                      {STATUS_LABELS[d.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                  </div>
                </div>

                <div className="bg-muted/60 p-3 rounded text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Klacht van de gebruiker:</p>
                  <p className="whitespace-pre-wrap">{d.reason}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Van: </span>
                    <Badge variant="outline" className="text-xs">
                      {LEVEL_LABELS[d.previousLevel] || d.previousLevel}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Naar: </span>
                    <Badge variant="outline" className="text-xs">
                      {LEVEL_LABELS[d.requestedLevel] || d.requestedLevel}
                    </Badge>
                  </div>
                </div>

                {d.aiRationale && (
                  <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded text-xs">
                    <p className="font-medium mb-0.5">AI-verdict: {d.aiVerdict === 'approved' ? 'goedgekeurd' : 'afgewezen'}</p>
                    <p className="text-muted-foreground">{d.aiRationale}</p>
                  </div>
                )}
                {d.adminRationale && (
                  <div className="bg-green-500/5 border border-green-500/20 p-2 rounded text-xs">
                    <p className="font-medium mb-0.5">Admin-verdict: {d.adminVerdict === 'approved' ? 'goedgekeurd' : 'afgewezen'}</p>
                    <p className="text-muted-foreground">{d.adminRationale}</p>
                  </div>
                )}

                {d.status === 'needs-human' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResolveDialog(d)}
                    >
                      Afhandelen
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Resolve dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute afhandelen</DialogTitle>
            <DialogDescription>
              Beoordeel de klacht van de gebruiker. Bij goedkeuren wordt de CV
              automatisch opnieuw gegenereerd in het gevraagde stijl-niveau.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">Klacht:</p>
                <p className="whitespace-pre-wrap">{selected.reason}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={resolveVerdict === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResolveVerdict('approved')}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Goedkeuren + regenereren
                </Button>
                <Button
                  variant={resolveVerdict === 'rejected' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setResolveVerdict('rejected')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Afwijzen
                </Button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Rationale voor de gebruiker (min. 10 tekens)
                </label>
                <Textarea
                  value={resolveRationale}
                  onChange={(e) => setResolveRationale(e.target.value)}
                  placeholder="Leg kort uit waarom je deze beslissing neemt..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolving || resolveRationale.trim().length < 10}
            >
              {resolving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Bezig...</>
              ) : (
                'Bevestigen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

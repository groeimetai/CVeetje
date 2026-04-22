'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, RotateCw } from 'lucide-react';
import type { PlatformOperation } from '@/lib/ai/platform-config';

interface PlatformConfig {
  models: Record<PlatformOperation, string>;
}

const OPERATIONS: Array<{ key: PlatformOperation; label: string; description: string }> = [
  { key: 'cv-generate', label: 'CV generatie', description: 'Creëert de inhoud van een CV uit profiel + vacature.' },
  { key: 'job-parse', label: 'Vacature parser', description: 'Zet ruwe vacaturetekst om in gestructureerde velden.' },
  { key: 'fit-analysis', label: 'Fit-analyse', description: 'Scoort profiel versus vacature en geeft advies.' },
  { key: 'style-generate', label: 'Style generator', description: 'Genereert design tokens voor het uiterlijk.' },
  { key: 'profile-parse', label: 'Profiel parser', description: 'Leest LinkedIn / PDF / foto-profielen in.' },
  { key: 'cv-chat', label: 'CV chat', description: 'Interactieve bewerkingen via chat op een bestaand CV.' },
];

const KNOWN_ANTHROPIC_MODELS = [
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

export function PlatformConfigSection() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [draft, setDraft] = useState<Record<PlatformOperation, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/platform-config');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Laden mislukt: ${text || response.statusText}`);
      }
      const data = (await response.json()) as { config: PlatformConfig };
      setConfig(data.config);
      setDraft({ ...data.config.models });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleChange = (op: PlatformOperation, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [op]: value } : prev));
    setMessage(null);
  };

  const dirtyFields: PlatformOperation[] = config && draft
    ? OPERATIONS
        .map((o) => o.key)
        .filter((op) => (draft[op] ?? '').trim() !== (config.models[op] ?? '').trim())
    : [];

  const handleSave = async () => {
    if (!draft || dirtyFields.length === 0) return;

    // Collect only changed fields
    const payload: Partial<Record<PlatformOperation, string>> = {};
    for (const op of dirtyFields) {
      const value = draft[op]?.trim();
      if (!value) {
        setError(`Model voor "${op}" mag niet leeg zijn.`);
        return;
      }
      payload[op] = value;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const response = await fetch('/api/admin/platform-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: payload }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Opslaan mislukt: ${text || response.statusText}`);
      }
      const data = (await response.json()) as { config: PlatformConfig };
      setConfig(data.config);
      setDraft({ ...data.config.models });
      setMessage(`${dirtyFields.length} model${dirtyFields.length === 1 ? '' : 's'} bijgewerkt.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!config) return;
    setDraft({ ...config.models });
    setMessage(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform AI modellen</CardTitle>
        <CardDescription>
          Welk Claude-model gebruikt wordt per operatie. Wijzigingen zijn direct van kracht voor
          nieuwe requests; de server cached de config 5 minuten. Veld leeg = standaardmodel.
          Bij een Opus 4.7 structured-output fout valt elke operatie automatisch terug op
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">claude-opus-4-6</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden…
          </div>
        ) : !config || !draft ? (
          <div className="text-destructive">{error ?? 'Config niet beschikbaar.'}</div>
        ) : (
          <div className="space-y-4">
            <datalist id="known-anthropic-models">
              {KNOWN_ANTHROPIC_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            {OPERATIONS.map(({ key, label, description }) => {
              const current = draft[key] ?? '';
              const saved = config.models[key] ?? '';
              const isDirty = current.trim() !== saved.trim();
              return (
                <div key={key} className="grid gap-1.5">
                  <Label htmlFor={`model-${key}`} className="flex items-center gap-2">
                    <span>{label}</span>
                    {isDirty && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        gewijzigd
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <Input
                    id={`model-${key}`}
                    list="known-anthropic-models"
                    value={current}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={saved}
                    className="font-mono text-sm"
                  />
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm">
                {error && <span className="text-destructive">{error}</span>}
                {message && !error && <span className="text-emerald-600 dark:text-emerald-400">{message}</span>}
                {!error && !message && dirtyFields.length > 0 && (
                  <span className="text-muted-foreground">
                    {dirtyFields.length} openstaande wijziging{dirtyFields.length === 1 ? '' : 'en'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving || dirtyFields.length === 0}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || dirtyFields.length === 0}
                >
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Opslaan
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

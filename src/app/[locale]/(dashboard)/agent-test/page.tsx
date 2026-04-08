'use client';

/**
 * Agent test page — minimal UI om de nieuwe `/api/cv/agent` runtime
 * end-to-end te kunnen valideren zonder de hele dashboard-flow te raken.
 *
 * **Status**: dev/test-only. Niet voor productie-gebruikers. De officiële
 * agent-mode in het dashboard komt in een latere fase.
 *
 * Wat het doet:
 * 1. Laadt de profielen van de huidige user via `/api/profiles`
 * 2. Laat je er één kiezen
 * 3. Fetcht het volledige profiel via `/api/profiles/[id]`
 * 4. Opent een chat-interface die `useChat` koppelt aan `/api/cv/agent`
 * 5. Toont text-deltas, tool-calls en tool-results in een eenvoudige feed
 */

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-context';
import type { ParsedLinkedIn, SavedProfileSummary } from '@/types';

interface FullProfileResponse {
  success: boolean;
  profile?: {
    id: string;
    name: string;
    parsedData: ParsedLinkedIn;
  };
  error?: string;
}

export default function AgentTestPage() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  // `profiles === null` betekent: nog niet geladen. Lege array = geladen, geen profielen.
  const [profiles, setProfiles] = useState<SavedProfileSummary[] | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [linkedIn, setLinkedIn] = useState<ParsedLinkedIn | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const loadingProfiles = profiles === null && !!user;

  // Load profiles list when user is available
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch('/api/profiles', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then((res) => res.json())
      .then((data: { success: boolean; profiles?: SavedProfileSummary[]; error?: string }) => {
        if (cancelled) return;
        if (data.success && data.profiles) {
          setProfiles(data.profiles);
          if (data.profiles.length > 0) {
            setSelectedProfileId(data.profiles[0].id);
          }
        } else {
          setProfiles([]);
          setProfileError(data.error ?? 'Kon profielen niet laden');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setProfiles([]);
        setProfileError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load full profile when selection changes
  useEffect(() => {
    if (!user || !selectedProfileId) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch(`/api/profiles/${selectedProfileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then((res) => res.json())
      .then((data: FullProfileResponse) => {
        if (cancelled) return;
        if (data.success && data.profile?.parsedData) {
          setLinkedIn(data.profile.parsedData);
        } else {
          setProfileError(data.error ?? 'Kon profiel niet laden');
        }
      })
      .catch((err) => !cancelled && setProfileError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [user, selectedProfileId]);

  // Build the chat transport — recreated when context changes
  const transport = useMemo(() => {
    if (!linkedIn) return null;
    return new DefaultChatTransport({
      api: '/api/cv/agent',
      body: {
        context: {
          linkedIn,
          language: 'nl',
        },
      },
    });
  }, [linkedIn]);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: transport ?? new DefaultChatTransport({ api: '/api/cv/agent' }),
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !linkedIn) return;
    const text = input.trim();
    setInput('');
    await sendMessage({ text });
  };

  if (authLoading) return <div className="p-8">Auth laden…</div>;
  if (!user) return <div className="p-8">Niet ingelogd.</div>;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Agent test (dev)</h1>
        <p className="text-sm text-muted-foreground">
          Minimale interface om de <code>/api/cv/agent</code> runtime te testen. Niet voor productie.
        </p>
      </header>

      {/* Profile selector */}
      <section className="mb-6 rounded-lg border bg-card p-4">
        <label className="mb-2 block text-sm font-medium">Profiel</label>
        {loadingProfiles ? (
          <div className="text-sm text-muted-foreground">Profielen laden…</div>
        ) : profileError ? (
          <div className="text-sm text-red-500">{profileError}</div>
        ) : !profiles || profiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Geen profielen gevonden. Maak er eerst één via de profielen-pagina.
          </div>
        ) : (
          <select
            className="w-full rounded border bg-background p-2 text-sm"
            value={selectedProfileId ?? ''}
            onChange={(e) => setSelectedProfileId(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.headline ? `— ${p.headline}` : ''} ({p.experienceCount} ervaring)
              </option>
            ))}
          </select>
        )}
        {linkedIn && (
          <div className="mt-2 text-xs text-muted-foreground">
            Geladen: {linkedIn.fullName} — {linkedIn.experience.length} ervaring, {linkedIn.skills.length} skills
          </div>
        )}
      </section>

      {/* Chat feed */}
      <section className="mb-4 space-y-3 rounded-lg border bg-card p-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nog geen bericht. Begin met bv. &quot;Hier is een vacature: …&quot; en plak een vacature-tekst.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-md p-3 text-sm ${
                msg.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted'
              }`}
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {msg.role === 'user' ? 'Jij' : 'Agent'}
              </div>
              {(msg.parts ?? []).map((part, idx) => {
                if (part.type === 'text') {
                  return (
                    <div key={idx} className="whitespace-pre-wrap">
                      {(part as { text: string }).text}
                    </div>
                  );
                }
                if (part.type.startsWith('tool-')) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const tp = part as any;
                  return (
                    <div key={idx} className="mt-2 rounded border border-dashed p-2 font-mono text-xs">
                      <div className="font-semibold">🔧 {tp.toolName ?? part.type}</div>
                      {tp.input && (
                        <div className="mt-1">
                          <span className="text-muted-foreground">input:</span>{' '}
                          <code>{JSON.stringify(tp.input).slice(0, 200)}</code>
                        </div>
                      )}
                      {tp.output && (
                        <div className="mt-1">
                          <span className="text-muted-foreground">output:</span>{' '}
                          <code>
                            {typeof tp.output === 'string'
                              ? tp.output.slice(0, 200)
                              : JSON.stringify(tp.output).slice(0, 200)}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))
        )}
        {isStreaming && <div className="text-xs text-muted-foreground">Agent is bezig…</div>}
        {error && <div className="text-xs text-red-500">Error: {error.message}</div>}
      </section>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          className="flex-1 rounded border bg-background p-2 text-sm"
          rows={3}
          placeholder="Typ een bericht voor de agent…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!linkedIn || isStreaming}
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!input.trim() || !linkedIn || isStreaming}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Verstuur
          </button>
          {isStreaming && (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded border px-4 py-2 text-sm"
            >
              Stop
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

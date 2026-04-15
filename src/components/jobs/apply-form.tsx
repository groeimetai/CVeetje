'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { ApplyQuestion } from '@/lib/jobs/providers/types';

export interface ApplyFormDefaults {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

interface ApplyFormProps {
  jobSlug: string;
  cvPdfBlob: Blob;
  cvFileName?: string;
  coverLetterBlob?: Blob;
  coverLetterFileName?: string;
  cvId?: string | null;
  questions?: ApplyQuestion[];
  defaults?: ApplyFormDefaults;
  onSuccess?: (applicationId: string) => void;
}

export function ApplyForm({
  jobSlug,
  cvPdfBlob,
  cvFileName = 'cv.pdf',
  coverLetterBlob,
  coverLetterFileName = 'motivatiebrief.pdf',
  cvId,
  questions = [],
  defaults = {},
  onSuccess,
}: ApplyFormProps) {
  const t = useTranslations('jobs.apply');

  const [firstName, setFirstName] = useState(defaults.firstName ?? '');
  const [lastName, setLastName] = useState(defaults.lastName ?? '');
  const [email, setEmail] = useState(defaults.email ?? '');
  const [phone, setPhone] = useState(defaults.phone ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(defaults.linkedinUrl ?? '');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [fileAnswers, setFileAnswers] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const updateAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const missing = questions
      .filter((q) => q.required)
      .filter((q) => {
        if (q.type === 'attachment') return !fileAnswers[q.id];
        const a = answers[q.id];
        if (a === undefined || a === null) return true;
        if (typeof a === 'string') return a.trim().length === 0;
        if (Array.isArray(a)) return a.length === 0;
        return false;
      });

    if (!firstName || !lastName || !email) {
      setError(t('requiredFieldsMissing'));
      return;
    }
    if (missing.length > 0) {
      setError(t('requiredFieldsMissing'));
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('firstName', firstName);
      form.append('lastName', lastName);
      form.append('email', email);
      if (phone) form.append('phone', phone);
      if (linkedinUrl) form.append('linkedinUrl', linkedinUrl);
      if (cvId) form.append('cvId', cvId);
      form.append('cv', cvPdfBlob, cvFileName);
      if (coverLetterBlob) {
        form.append('coverLetter', coverLetterBlob, coverLetterFileName);
      }
      if (Object.keys(answers).length > 0) {
        form.append('answers', JSON.stringify(answers));
      }
      for (const [questionId, file] of Object.entries(fileAnswers)) {
        form.append(`file:${questionId}`, file, file.name);
      }

      const res = await fetch(`/api/jobs/${encodeURIComponent(jobSlug)}/apply`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const message =
          data?.details?.[0]?.message || data?.error || t('failed');
        throw new Error(message);
      }

      setSuccessId(data.applicationId);
      onSuccess?.(data.applicationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">{t('success')}</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/applications">→ Mijn sollicitaties</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="apply-fn">{t('firstName')}</Label>
          <Input
            id="apply-fn"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="apply-ln">{t('lastName')}</Label>
          <Input
            id="apply-ln"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="apply-email">{t('email')}</Label>
        <Input
          id="apply-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="apply-phone">{t('phone')}</Label>
          <Input
            id="apply-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="apply-linkedin">{t('linkedinUrl')}</Label>
          <Input
            id="apply-linkedin"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-medium text-sm">{t('questionsHeading')}</h4>
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <Label>
                {q.label}
                {q.required && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({t('required')})
                  </span>
                )}
              </Label>
              {q.type === 'long_text' ? (
                <Textarea
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              ) : q.type === 'select' && q.options ? (
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                >
                  <option value="">—</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : q.type === 'boolean' ? (
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                >
                  <option value="">—</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nee</option>
                </select>
              ) : q.type === 'attachment' ? (
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFileAnswers((prev) => ({ ...prev, [q.id]: file }));
                    } else {
                      setFileAnswers((prev) => {
                        const next = { ...prev };
                        delete next[q.id];
                        return next;
                      });
                    }
                  }}
                />
              ) : (
                <Input
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              )}
              {q.description && (
                <p className="text-xs text-muted-foreground">{q.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p>
          📄 CV: <span className="font-medium text-foreground">{cvFileName}</span>
        </p>
        {coverLetterBlob && (
          <p>
            📝 Motivatiebrief:{' '}
            <span className="font-medium text-foreground">{coverLetterFileName}</span>
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('submitting')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            {t('submit')}
          </>
        )}
      </Button>
    </form>
  );
}

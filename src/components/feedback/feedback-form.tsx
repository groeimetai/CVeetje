'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, Bug, MessageCircle } from 'lucide-react';
import { FeedbackImageUpload } from './feedback-image-upload';
import type { FeedbackType } from '@/types';

const featureRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  useCase: z.string().max(1000).optional(),
  expectedBehavior: z.string().max(1000).optional(),
});

const bugReportSchema = z.object({
  title: z.string().min(3).max(200),
  stepsToReproduce: z.string().min(10).max(2000),
  expectedBehavior: z.string().min(5).max(1000),
  actualBehavior: z.string().min(5).max(1000),
  browserInfo: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

const generalFeedbackSchema = z.object({
  title: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
  category: z.enum(['ux', 'performance', 'content', 'other']),
});

interface FeedbackFormProps {
  onSuccess: () => void;
}

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const t = useTranslations('feedback');
  const [activeType, setActiveType] = useState<FeedbackType>('feature_request');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const featureForm = useForm<z.infer<typeof featureRequestSchema>>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: { priority: 'medium' },
  });

  const bugForm = useForm<z.infer<typeof bugReportSchema>>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      severity: 'medium',
      browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    },
  });

  const generalForm = useForm<z.infer<typeof generalFeedbackSchema>>({
    resolver: zodResolver(generalFeedbackSchema),
    defaultValues: { category: 'ux' },
  });

  const submitFeedback = async (type: FeedbackType, data: Record<string, unknown>) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data, imageUrls }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || t('form.submitError'));
      }

      setSuccess(t('form.submitSuccess'));
      setImageUrls([]);
      featureForm.reset();
      bugForm.reset({ severity: 'medium', browserInfo: navigator.userAgent });
      generalForm.reset({ category: 'ux' });
      onSuccess();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('submitTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeType}
          onValueChange={v => setActiveType(v as FeedbackType)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="feature_request" className="flex-1 text-xs sm:text-sm">
              <Lightbulb className="mr-1 size-3.5" />
              {t('tabs.featureRequest')}
            </TabsTrigger>
            <TabsTrigger value="bug_report" className="flex-1 text-xs sm:text-sm">
              <Bug className="mr-1 size-3.5" />
              {t('tabs.bugReport')}
            </TabsTrigger>
            <TabsTrigger value="general_feedback" className="flex-1 text-xs sm:text-sm">
              <MessageCircle className="mr-1 size-3.5" />
              {t('tabs.generalFeedback')}
            </TabsTrigger>
          </TabsList>

          {/* Feature Request */}
          <TabsContent value="feature_request">
            <form
              onSubmit={featureForm.handleSubmit(data =>
                submitFeedback('feature_request', data)
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>{t('form.title')}</Label>
                <Input
                  {...featureForm.register('title')}
                  placeholder={t('form.titlePlaceholder')}
                />
                {featureForm.formState.errors.title && (
                  <p className="text-xs text-destructive">{featureForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('form.description')}</Label>
                <Textarea
                  {...featureForm.register('description')}
                  placeholder={t('form.descriptionPlaceholder')}
                  rows={4}
                />
                {featureForm.formState.errors.description && (
                  <p className="text-xs text-destructive">{featureForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('form.priority')}</Label>
                  <Select
                    value={featureForm.watch('priority')}
                    onValueChange={v => featureForm.setValue('priority', v as 'low' | 'medium' | 'high' | 'critical')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('form.useCase')}</Label>
                <Textarea
                  {...featureForm.register('useCase')}
                  placeholder={t('form.useCasePlaceholder')}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('form.expectedBehavior')}</Label>
                <Textarea
                  {...featureForm.register('expectedBehavior')}
                  placeholder={t('form.expectedBehaviorPlaceholder')}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('form.images')}</Label>
                <FeedbackImageUpload imageUrls={imageUrls} onChange={setImageUrls} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t('form.submitting') : t('form.submit')}
              </Button>
            </form>
          </TabsContent>

          {/* Bug Report */}
          <TabsContent value="bug_report">
            <form
              onSubmit={bugForm.handleSubmit(data =>
                submitFeedback('bug_report', data)
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>{t('form.title')}</Label>
                <Input
                  {...bugForm.register('title')}
                  placeholder={t('form.titlePlaceholder')}
                />
                {bugForm.formState.errors.title && (
                  <p className="text-xs text-destructive">{bugForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('form.stepsToReproduce')}</Label>
                <Textarea
                  {...bugForm.register('stepsToReproduce')}
                  placeholder={t('form.stepsToReproducePlaceholder')}
                  rows={4}
                />
                {bugForm.formState.errors.stepsToReproduce && (
                  <p className="text-xs text-destructive">{bugForm.formState.errors.stepsToReproduce.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('form.expectedBehavior')}</Label>
                  <Textarea
                    {...bugForm.register('expectedBehavior')}
                    placeholder={t('form.expectedBehaviorPlaceholder')}
                    rows={3}
                  />
                  {bugForm.formState.errors.expectedBehavior && (
                    <p className="text-xs text-destructive">{bugForm.formState.errors.expectedBehavior.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.actualBehavior')}</Label>
                  <Textarea
                    {...bugForm.register('actualBehavior')}
                    placeholder={t('form.actualBehaviorPlaceholder')}
                    rows={3}
                  />
                  {bugForm.formState.errors.actualBehavior && (
                    <p className="text-xs text-destructive">{bugForm.formState.errors.actualBehavior.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('form.severity')}</Label>
                  <Select
                    value={bugForm.watch('severity')}
                    onValueChange={v => bugForm.setValue('severity', v as 'low' | 'medium' | 'high' | 'critical')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('form.browserInfo')}</Label>
                  <Input
                    {...bugForm.register('browserInfo')}
                    placeholder={t('form.browserInfoPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('form.images')}</Label>
                <FeedbackImageUpload imageUrls={imageUrls} onChange={setImageUrls} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t('form.submitting') : t('form.submit')}
              </Button>
            </form>
          </TabsContent>

          {/* General Feedback */}
          <TabsContent value="general_feedback">
            <form
              onSubmit={generalForm.handleSubmit(data =>
                submitFeedback('general_feedback', data)
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>{t('form.title')}</Label>
                <Input
                  {...generalForm.register('title')}
                  placeholder={t('form.titlePlaceholder')}
                />
                {generalForm.formState.errors.title && (
                  <p className="text-xs text-destructive">{generalForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('form.message')}</Label>
                <Textarea
                  {...generalForm.register('message')}
                  placeholder={t('form.messagePlaceholder')}
                  rows={4}
                />
                {generalForm.formState.errors.message && (
                  <p className="text-xs text-destructive">{generalForm.formState.errors.message.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('form.category')}</Label>
                <Select
                  value={generalForm.watch('category')}
                  onValueChange={v => generalForm.setValue('category', v as 'ux' | 'performance' | 'content' | 'other')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ux">{t('category.ux')}</SelectItem>
                    <SelectItem value="performance">{t('category.performance')}</SelectItem>
                    <SelectItem value="content">{t('category.content')}</SelectItem>
                    <SelectItem value="other">{t('category.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('form.images')}</Label>
                <FeedbackImageUpload imageUrls={imageUrls} onChange={setImageUrls} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t('form.submitting') : t('form.submit')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
        {success && (
          <p className="mt-4 text-sm text-green-600">{success}</p>
        )}
      </CardContent>
    </Card>
  );
}

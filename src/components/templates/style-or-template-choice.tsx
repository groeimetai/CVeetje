'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Palette,
  FileText,
  ArrowRight,
  Sparkles,
  Upload,
} from 'lucide-react';

interface StyleOrTemplateChoiceProps {
  onChooseStyle: () => void;
  onChooseTemplate: () => void;
  hasTemplates?: boolean;
}

export function StyleOrTemplateChoice({
  onChooseStyle,
  onChooseTemplate,
  hasTemplates = false,
}: StyleOrTemplateChoiceProps) {
  const t = useTranslations('templates.choice');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Own Style Option */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
          onClick={onChooseStyle}
        >
          <div className="absolute top-2 right-2">
            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
              {t('recommended')}
            </span>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              {t('ownStyle.title')}
            </CardTitle>
            <CardDescription>{t('ownStyle.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{t('ownStyle.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{t('ownStyle.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{t('ownStyle.feature3')}</span>
              </li>
            </ul>
            <Button className="w-full">
              {t('ownStyle.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Template Option */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={onChooseTemplate}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary">
                <FileText className="h-5 w-5" />
              </div>
              {t('template.title')}
            </CardTitle>
            <CardDescription>{t('template.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <Upload className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('template.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Upload className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('template.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Upload className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('template.feature3')}</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              {hasTemplates ? t('template.buttonWithTemplates') : t('template.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Palette,
  ArrowRight,
  Sparkles,
  Upload,
  Eye,
} from 'lucide-react';

interface StyleOrTemplateChoiceProps {
  onChooseStyle: () => void;
  onChooseTemplateStyle: () => void;
}

export function StyleOrTemplateChoice({
  onChooseStyle,
  onChooseTemplateStyle,
}: StyleOrTemplateChoiceProps) {
  const t = useTranslations('templates.choice');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Style Option */}
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

        {/* Own Design Option */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={onChooseTemplateStyle}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary">
                <Eye className="h-5 w-5" />
              </div>
              {t('templateStyle.title')}
            </CardTitle>
            <CardDescription>{t('templateStyle.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <Upload className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('templateStyle.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('templateStyle.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{t('templateStyle.feature3')}</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              {t('templateStyle.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Palette, Check } from 'lucide-react';
import type { CVTemplate, CVColorScheme } from '@/types';

interface StylePickerProps {
  onSelect: (template: CVTemplate, colorScheme: CVColorScheme) => void;
  initialTemplate?: CVTemplate;
  initialColorScheme?: CVColorScheme;
}

const templates: { id: CVTemplate; name: string; description: string }[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and contemporary design with accent colors',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional, formal layout with serif fonts',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant with focus on content',
  },
];

const colorSchemes: { name: string; colors: CVColorScheme }[] = [
  {
    name: 'Ocean Blue',
    colors: { primary: '#1e40af', secondary: '#dbeafe', accent: '#3b82f6' },
  },
  {
    name: 'Forest Green',
    colors: { primary: '#166534', secondary: '#dcfce7', accent: '#22c55e' },
  },
  {
    name: 'Professional Gray',
    colors: { primary: '#374151', secondary: '#f3f4f6', accent: '#6b7280' },
  },
  {
    name: 'Royal Purple',
    colors: { primary: '#6b21a8', secondary: '#f3e8ff', accent: '#a855f7' },
  },
  {
    name: 'Warm Coral',
    colors: { primary: '#c2410c', secondary: '#fff7ed', accent: '#f97316' },
  },
  {
    name: 'Slate',
    colors: { primary: '#1e293b', secondary: '#f1f5f9', accent: '#475569' },
  },
];

export function StylePicker({ onSelect, initialTemplate, initialColorScheme }: StylePickerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>(initialTemplate || 'modern');
  const [selectedColorScheme, setSelectedColorScheme] = useState<CVColorScheme>(
    initialColorScheme || colorSchemes[0].colors
  );

  const handleContinue = () => {
    onSelect(selectedTemplate, selectedColorScheme);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          CV Style
        </CardTitle>
        <CardDescription>
          Choose a template and color scheme for your CV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-3">
          <Label>Template</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  'relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary',
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                {selectedTemplate === template.id && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className="mb-3 h-24 rounded-md border"
                  style={{
                    background: template.id === 'modern'
                      ? `linear-gradient(to bottom, ${selectedColorScheme.primary} 20%, white 20%)`
                      : template.id === 'classic'
                      ? 'white'
                      : '#fafafa',
                  }}
                >
                  {/* Mini preview */}
                  <div className="p-2">
                    <div
                      className="h-2 w-16 rounded"
                      style={{ backgroundColor: template.id === 'classic' ? '#333' : selectedColorScheme.primary }}
                    />
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full rounded bg-gray-200" />
                      <div className="h-1.5 w-3/4 rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Color Scheme Selection */}
        <div className="space-y-3">
          <Label>Color Scheme</Label>
          <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.name}
                onClick={() => setSelectedColorScheme(scheme.colors)}
                className={cn(
                  'relative rounded-lg border-2 p-2 transition-all hover:border-primary',
                  JSON.stringify(selectedColorScheme) === JSON.stringify(scheme.colors)
                    ? 'border-primary'
                    : 'border-border'
                )}
                title={scheme.name}
              >
                <div className="flex flex-col gap-1">
                  <div
                    className="h-6 rounded-sm"
                    style={{ backgroundColor: scheme.colors.primary }}
                  />
                  <div className="flex gap-1">
                    <div
                      className="h-3 flex-1 rounded-sm"
                      style={{ backgroundColor: scheme.colors.secondary }}
                    />
                    <div
                      className="h-3 flex-1 rounded-sm"
                      style={{ backgroundColor: scheme.colors.accent }}
                    />
                  </div>
                </div>
                {JSON.stringify(selectedColorScheme) === JSON.stringify(scheme.colors) && (
                  <div className="absolute -right-1 -top-1">
                    <div className="rounded-full bg-primary p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {colorSchemes.find(s =>
              JSON.stringify(s.colors) === JSON.stringify(selectedColorScheme)
            )?.name || 'Custom'}
          </p>
        </div>

        {/* Preview Colors */}
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-2">Color Preview</p>
          <div className="flex gap-4">
            <div className="text-center">
              <div
                className="h-10 w-10 rounded-full mx-auto"
                style={{ backgroundColor: selectedColorScheme.primary }}
              />
              <p className="text-xs text-muted-foreground mt-1">Primary</p>
            </div>
            <div className="text-center">
              <div
                className="h-10 w-10 rounded-full mx-auto border"
                style={{ backgroundColor: selectedColorScheme.secondary }}
              />
              <p className="text-xs text-muted-foreground mt-1">Secondary</p>
            </div>
            <div className="text-center">
              <div
                className="h-10 w-10 rounded-full mx-auto"
                style={{ backgroundColor: selectedColorScheme.accent }}
              />
              <p className="text-xs text-muted-foreground mt-1">Accent</p>
            </div>
          </div>
        </div>

        <Button onClick={handleContinue} className="w-full">
          Continue with this style
        </Button>
      </CardContent>
    </Card>
  );
}

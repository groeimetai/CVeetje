'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import type {
  SVGDecorationConfig,
  SVGDecorationTheme,
  SVGDecorationPlacement,
  CVStyleColors,
} from '@/types';
import { generateSVGDecorations, getSVGThemeDescription } from '@/lib/svg/decorations';

interface SVGDecorationToggleProps {
  config: SVGDecorationConfig | undefined;
  colors: CVStyleColors;
  onChange: (config: SVGDecorationConfig) => void;
  formalityLevel: 'casual' | 'professional' | 'formal';
}

const defaultConfig: SVGDecorationConfig = {
  enabled: false,
  theme: 'geometric',
  placement: 'corners',
  opacity: 0.15,
  scale: 'medium',
  colorSource: 'primary',
};

const themeOptions: { value: SVGDecorationTheme; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'organic', label: 'Organic' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tech', label: 'Tech' },
  { value: 'creative', label: 'Creative' },
];

const placementOptions: { value: SVGDecorationPlacement; label: string; description: string }[] = [
  { value: 'corners', label: 'Corners', description: 'Decorations in corners (safest)' },
  { value: 'header', label: 'Header', description: 'Around the header area' },
  { value: 'background', label: 'Background', description: 'Subtle watermark pattern' },
];

const scaleOptions: { value: 'small' | 'medium' | 'large'; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const colorSourceOptions: { value: SVGDecorationConfig['colorSource']; label: string }[] = [
  { value: 'primary', label: 'Primary Color' },
  { value: 'accent', label: 'Accent Color' },
  { value: 'mixed', label: 'Mixed Colors' },
];

export function SVGDecorationToggle({
  config,
  colors,
  onChange,
  formalityLevel,
}: SVGDecorationToggleProps) {
  const currentConfig = config || defaultConfig;
  const [showPreview, setShowPreview] = useState(true);

  const handleChange = (updates: Partial<SVGDecorationConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  // Generate preview
  const previewDecorations = currentConfig.enabled
    ? generateSVGDecorations(currentConfig, colors)
    : null;

  // Warning for formal styles
  const showFormalWarning = formalityLevel === 'formal' && currentConfig.enabled;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Visual Decorations
          </CardTitle>
          <Switch
            checked={currentConfig.enabled}
            onCheckedChange={(enabled) => handleChange({ enabled })}
          />
        </div>
        <CardDescription className="text-xs">
          Add playful SVG decorations to your CV for creative industries
        </CardDescription>
      </CardHeader>

      {currentConfig.enabled && (
        <CardContent className="space-y-4">
          {showFormalWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <strong>Note:</strong> Visual decorations are typically not recommended for formal industries
              (finance, law, consulting). Consider disabling them for a more professional appearance.
            </div>
          )}

          {/* Theme Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Theme</Label>
            <Select
              value={currentConfig.theme}
              onValueChange={(value) => handleChange({ theme: value as SVGDecorationTheme })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getSVGThemeDescription(currentConfig.theme)}
            </p>
          </div>

          {/* Placement Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Placement</Label>
            <Select
              value={currentConfig.placement}
              onValueChange={(value) => handleChange({ placement: value as SVGDecorationPlacement })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {placementOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Opacity</Label>
              <span className="text-xs text-muted-foreground">
                {(currentConfig.opacity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[currentConfig.opacity * 100]}
              onValueChange={([value]) => handleChange({ opacity: value / 100 })}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower for subtle, higher for more visible decorations
            </p>
          </div>

          {/* Scale Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Scale</Label>
            <div className="flex gap-2">
              {scaleOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={currentConfig.scale === option.value ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleChange({ scale: option.value })}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Color Source Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Color Source</Label>
            <Select
              value={currentConfig.colorSource}
              onValueChange={(value) => handleChange({ colorSource: value as SVGDecorationConfig['colorSource'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorSourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: option.value === 'primary' ? colors.primary :
                                     option.value === 'accent' ? colors.accent :
                                     `linear-gradient(45deg, ${colors.primary}, ${colors.accent})`,
                        }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Preview</Label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && previewDecorations && (
              <div
                className="border rounded-lg p-4 relative overflow-hidden bg-white"
                style={{ minHeight: '120px' }}
              >
                {/* Decoration preview */}
                <div className="absolute inset-0 pointer-events-none">
                  {previewDecorations.topLeft && (
                    <div
                      className="absolute top-0 left-0"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                      dangerouslySetInnerHTML={{ __html: previewDecorations.topLeft }}
                    />
                  )}
                  {previewDecorations.topRight && (
                    <div
                      className="absolute top-0 right-0"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top right' }}
                      dangerouslySetInnerHTML={{ __html: previewDecorations.topRight }}
                    />
                  )}
                  {previewDecorations.bottomLeft && (
                    <div
                      className="absolute bottom-0 left-0"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'bottom left' }}
                      dangerouslySetInnerHTML={{ __html: previewDecorations.bottomLeft }}
                    />
                  )}
                  {previewDecorations.bottomRight && (
                    <div
                      className="absolute bottom-0 right-0"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'bottom right' }}
                      dangerouslySetInnerHTML={{ __html: previewDecorations.bottomRight }}
                    />
                  )}
                  {previewDecorations.background && (
                    <div
                      className="absolute inset-0"
                      dangerouslySetInnerHTML={{ __html: previewDecorations.background }}
                    />
                  )}
                </div>
                {/* Sample content */}
                <div className="relative z-10 text-center">
                  <p className="text-sm font-medium" style={{ color: colors.primary }}>
                    John Doe
                  </p>
                  <p className="text-xs text-muted-foreground">Software Engineer</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

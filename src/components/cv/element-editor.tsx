'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Palette, X, Undo2 } from 'lucide-react';
import type { ElementOverride, EditableElementType, CVElementOverrides } from '@/types';

interface SelectedElement {
  elementId: string;
  elementType: EditableElementType;
  elementLabel: string;
}

interface ElementEditorProps {
  selectedElement: SelectedElement | null;
  elementOverrides: CVElementOverrides;
  onUpdateOverride: (override: ElementOverride) => void;
  onRemoveOverride: (elementId: string) => void;
  onClose: () => void;
}

// Predefined color options for quick selection
const colorPresets = [
  { name: 'Primary Blue', value: '#1e40af' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose', value: '#be185d' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Slate', value: '#334155' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#dc2626' },
];

const bgColorPresets = [
  { name: 'Light Blue', value: '#eff6ff' },
  { name: 'Light Indigo', value: '#eef2ff' },
  { name: 'Light Green', value: '#ecfdf5' },
  { name: 'Light Rose', value: '#fdf2f8' },
  { name: 'Light Amber', value: '#fffbeb' },
  { name: 'Light Gray', value: '#f8fafc' },
  { name: 'White', value: '#ffffff' },
  { name: 'Transparent', value: 'transparent' },
];

export function ElementEditor({
  selectedElement,
  elementOverrides,
  onUpdateOverride,
  onRemoveOverride,
  onClose,
}: ElementEditorProps) {
  // Get current override for selected element
  const currentOverride = selectedElement
    ? elementOverrides.overrides.find(o => o.elementId === selectedElement.elementId)
    : null;

  const [isHidden, setIsHidden] = useState(currentOverride?.hidden ?? false);
  const [colorOverride, setColorOverride] = useState(currentOverride?.colorOverride ?? '');
  const [bgOverride, setBgOverride] = useState(currentOverride?.backgroundOverride ?? '');

  // Update local state when selection changes
  useEffect(() => {
    if (selectedElement) {
      const override = elementOverrides.overrides.find(o => o.elementId === selectedElement.elementId);
      setIsHidden(override?.hidden ?? false);
      setColorOverride(override?.colorOverride ?? '');
      setBgOverride(override?.backgroundOverride ?? '');
    }
  }, [selectedElement, elementOverrides]);

  const handleSave = useCallback(() => {
    if (!selectedElement) return;

    const override: ElementOverride = {
      elementId: selectedElement.elementId,
      elementType: selectedElement.elementType,
      hidden: isHidden,
      colorOverride: colorOverride || undefined,
      backgroundOverride: bgOverride || undefined,
    };

    onUpdateOverride(override);
  }, [selectedElement, isHidden, colorOverride, bgOverride, onUpdateOverride]);

  const handleReset = useCallback(() => {
    if (!selectedElement) return;
    onRemoveOverride(selectedElement.elementId);
    setIsHidden(false);
    setColorOverride('');
    setBgOverride('');
  }, [selectedElement, onRemoveOverride]);

  // Auto-save when values change
  useEffect(() => {
    if (selectedElement) {
      const timer = setTimeout(handleSave, 300);
      return () => clearTimeout(timer);
    }
  }, [isHidden, colorOverride, bgOverride, selectedElement, handleSave]);

  if (!selectedElement) {
    return (
      <Card className="w-72 shadow-lg">
        <CardContent className="p-4 text-center text-muted-foreground">
          <p className="text-sm">Click on an element in the preview to edit it</p>
        </CardContent>
      </Card>
    );
  }

  const getElementTypeLabel = (type: EditableElementType) => {
    const labels: Record<EditableElementType, string> = {
      section: 'Section',
      'experience-item': 'Experience',
      'education-item': 'Education',
      'skill-tag': 'Skill',
      'language-item': 'Language',
      'certification-item': 'Certification',
      summary: 'Summary',
      header: 'Header',
    };
    return labels[type] || type;
  };

  return (
    <Card className="w-80 shadow-lg border-2 border-primary/20">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
              {getElementTypeLabel(selectedElement.elementType)}
            </span>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {selectedElement.elementLabel}
        </p>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-4">
        {/* Visibility Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="visibility" className="flex items-center gap-2 text-sm">
            {isHidden ? <EyeOff className="h-4 w-4 text-red-500" /> : <Eye className="h-4 w-4 text-green-500" />}
            Visibility
          </Label>
          <Switch
            id="visibility"
            checked={!isHidden}
            onCheckedChange={(checked) => setIsHidden(!checked)}
          />
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4" />
            Text Color
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="#1e40af"
              value={colorOverride}
              onChange={(e) => setColorOverride(e.target.value)}
              className="flex-1 h-8 text-xs"
            />
            <Input
              type="color"
              value={colorOverride || '#000000'}
              onChange={(e) => setColorOverride(e.target.value)}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {colorPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setColorOverride(preset.value)}
                className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              />
            ))}
            <button
              onClick={() => setColorOverride('')}
              className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center text-xs text-gray-400"
              title="Clear"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Background Color (only for certain element types) */}
        {['section', 'experience-item', 'education-item', 'summary', 'header'].includes(selectedElement.elementType) && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              Background
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="#f8fafc"
                value={bgOverride}
                onChange={(e) => setBgOverride(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Input
                type="color"
                value={bgOverride || '#ffffff'}
                onChange={(e) => setBgOverride(e.target.value)}
                className="w-8 h-8 p-0 border-0 cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {bgColorPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setBgOverride(preset.value)}
                  className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: preset.value === 'transparent' ? '#fff' : preset.value }}
                  title={preset.name}
                >
                  {preset.value === 'transparent' && <span className="text-[8px]">∅</span>}
                </button>
              ))}
              <button
                onClick={() => setBgOverride('')}
                className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center text-xs text-gray-400"
                title="Clear"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {currentOverride && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full text-xs"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Reset to Original
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

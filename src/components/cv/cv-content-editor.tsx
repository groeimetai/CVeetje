'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Check, X, Mail, Phone, MapPin, Linkedin, Github, Globe, Palette } from 'lucide-react';
import type { GeneratedCVContent, GeneratedCVExperience, GeneratedCVEducation, CVContactInfo } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  label?: string;
  color?: string;
  onColorChange?: (color: string | undefined) => void;
}

function EditableField({ value, onChange, multiline, className, label, color, onColorChange }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    colorInputRef.current?.click();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange?.(e.target.value);
  };

  const handleResetColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onColorChange?.(undefined);
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-h-[80px] ${className}`}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 ${className}`}
          />
        )}
        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8">
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1">
      <span
        className={className}
        style={color ? { color } : undefined}
        onClick={() => setIsEditing(true)}
      >
        {value}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Pencil
          className="h-3 w-3 text-muted-foreground mt-1 cursor-pointer hover:text-foreground"
          onClick={() => setIsEditing(true)}
        />
        {onColorChange && (
          <>
            <div className="relative">
              <div
                className="h-4 w-4 rounded border border-border cursor-pointer mt-0.5 hover:ring-2 hover:ring-primary/50"
                style={{ backgroundColor: color || '#888888' }}
                onClick={handleColorClick}
                title="Kleur aanpassen"
              />
              <input
                ref={colorInputRef}
                type="color"
                value={color || '#000000'}
                onChange={handleColorChange}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
            {color && (
              <span title="Kleur resetten">
                <X
                  className="h-3 w-3 text-muted-foreground mt-1 cursor-pointer hover:text-destructive"
                  onClick={handleResetColor}
                />
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface HeaderInfo {
  fullName: string;
  headline?: string | null;
  contactInfo?: CVContactInfo | null;
}

interface ColorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, description, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer bg-transparent"
          style={{ padding: 0 }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
            onChange(val);
          }
        }}
        className="w-24 text-xs font-mono"
        placeholder="#000000"
      />
    </div>
  );
}

// Element color overrides - maps element IDs to colors
export interface ElementColorOverrides {
  [elementId: string]: string | undefined;
}

interface CVContentEditorProps {
  content: GeneratedCVContent;
  onContentChange: (content: GeneratedCVContent) => void;
  headerInfo?: HeaderInfo;
  onHeaderChange?: (header: HeaderInfo) => void;
  colors?: CVDesignTokens['colors'];
  onColorsChange?: (colors: CVDesignTokens['colors']) => void;
  elementColors?: ElementColorOverrides;
  onElementColorChange?: (elementId: string, color: string | undefined) => void;
}

export function CVContentEditor({
  content,
  onContentChange,
  headerInfo,
  onHeaderChange,
  colors,
  onColorsChange,
  elementColors,
  onElementColorChange,
}: CVContentEditorProps) {
  const updateSummary = useCallback((newSummary: string) => {
    onContentChange({ ...content, summary: newSummary });
  }, [content, onContentChange]);

  const updateColor = useCallback((key: keyof CVDesignTokens['colors'], value: string) => {
    if (colors && onColorsChange) {
      onColorsChange({ ...colors, [key]: value });
    }
  }, [colors, onColorsChange]);

  // Helper to get element color
  const getElementColor = useCallback((elementId: string) => {
    return elementColors?.[elementId];
  }, [elementColors]);

  // Helper to set element color
  const setElementColor = useCallback((elementId: string, color: string | undefined) => {
    onElementColorChange?.(elementId, color);
  }, [onElementColorChange]);

  const updateHeader = useCallback((updates: Partial<HeaderInfo>) => {
    if (headerInfo && onHeaderChange) {
      onHeaderChange({ ...headerInfo, ...updates });
    }
  }, [headerInfo, onHeaderChange]);

  const updateContactInfo = useCallback((updates: Partial<CVContactInfo>) => {
    if (headerInfo && onHeaderChange) {
      onHeaderChange({
        ...headerInfo,
        contactInfo: { ...headerInfo.contactInfo, ...updates },
      });
    }
  }, [headerInfo, onHeaderChange]);

  const updateExperience = useCallback((index: number, updates: Partial<GeneratedCVExperience>) => {
    const newExperience = [...content.experience];
    newExperience[index] = { ...newExperience[index], ...updates };
    onContentChange({ ...content, experience: newExperience });
  }, [content, onContentChange]);

  const updateExperienceHighlight = useCallback((expIndex: number, highlightIndex: number, value: string) => {
    const newExperience = [...content.experience];
    const newHighlights = [...newExperience[expIndex].highlights];
    newHighlights[highlightIndex] = value;
    newExperience[expIndex] = { ...newExperience[expIndex], highlights: newHighlights };
    onContentChange({ ...content, experience: newExperience });
  }, [content, onContentChange]);

  const updateEducation = useCallback((index: number, updates: Partial<GeneratedCVEducation>) => {
    const newEducation = [...content.education];
    newEducation[index] = { ...newEducation[index], ...updates };
    onContentChange({ ...content, education: newEducation });
  }, [content, onContentChange]);

  return (
    <div className="space-y-6 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Bewerk CV Inhoud</h3>
        <p className="text-xs text-muted-foreground">Klik op tekst om te bewerken</p>
      </div>

      {/* Header / Personal Info */}
      {headerInfo && onHeaderChange && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Persoonlijke Gegevens</h4>
          <div className="p-3 border rounded bg-background space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Naam</span>
              <EditableField
                value={headerInfo.fullName}
                onChange={(v) => updateHeader({ fullName: v })}
                className="font-semibold text-lg"
                color={getElementColor('header-name')}
                onColorChange={(c) => setElementColor('header-name', c)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Functietitel / Headline</span>
              <EditableField
                value={headerInfo.headline || ''}
                onChange={(v) => updateHeader({ headline: v || null })}
                className="text-sm"
                color={getElementColor('header-headline')}
                onColorChange={(c) => setElementColor('header-headline', c)}
              />
            </div>

            {/* Contact Info */}
            <div className="pt-2 border-t space-y-2">
              <span className="text-xs text-muted-foreground font-medium">Contactgegevens</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.email || ''}
                    onChange={(v) => updateContactInfo({ email: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.phone || ''}
                    onChange={(v) => updateContactInfo({ phone: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.location || ''}
                    onChange={(v) => updateContactInfo({ location: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.linkedinUrl || ''}
                    onChange={(v) => updateContactInfo({ linkedinUrl: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.github || ''}
                    onChange={(v) => updateContactInfo({ github: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <EditableField
                    value={headerInfo.contactInfo?.website || ''}
                    onChange={(v) => updateContactInfo({ website: v || undefined })}
                    className="text-sm flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colors */}
      {colors && onColorsChange && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Kleuren
          </h4>
          <div className="p-3 border rounded bg-background space-y-4">
            <ColorPicker
              label="Primair"
              description="Naam, koppen en accenten"
              value={colors.primary}
              onChange={(v) => updateColor('primary', v)}
            />
            <ColorPicker
              label="Secundair"
              description="Achtergrond en subtiele elementen"
              value={colors.secondary}
              onChange={(v) => updateColor('secondary', v)}
            />
            <ColorPicker
              label="Accent"
              description="Links en highlights"
              value={colors.accent}
              onChange={(v) => updateColor('accent', v)}
            />
            <ColorPicker
              label="Tekst"
              description="Hoofdtekst kleur"
              value={colors.text}
              onChange={(v) => updateColor('text', v)}
            />
            <ColorPicker
              label="Gedempte tekst"
              description="Secundaire tekst en labels"
              value={colors.muted}
              onChange={(v) => updateColor('muted', v)}
            />
            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              Let op: zorg voor voldoende contrast tussen tekst en achtergrond voor leesbaarheid.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Samenvatting</h4>
        <EditableField
          value={content.summary}
          onChange={updateSummary}
          multiline
          className="text-sm"
          color={getElementColor('summary')}
          onColorChange={(c) => setElementColor('summary', c)}
        />
      </div>

      {/* Experience */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Werkervaring</h4>
        {content.experience.map((exp, expIndex) => (
          <div key={expIndex} className="space-y-2 p-3 border rounded bg-background">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <EditableField
                  value={exp.title}
                  onChange={(v) => updateExperience(expIndex, { title: v })}
                  className="font-medium"
                  color={getElementColor(`exp-${expIndex}-title`)}
                  onColorChange={(c) => setElementColor(`exp-${expIndex}-title`, c)}
                />
                <EditableField
                  value={exp.company}
                  onChange={(v) => updateExperience(expIndex, { company: v })}
                  className="text-sm text-muted-foreground"
                  color={getElementColor(`exp-${expIndex}-company`)}
                  onColorChange={(c) => setElementColor(`exp-${expIndex}-company`, c)}
                />
              </div>
              <EditableField
                value={exp.period}
                onChange={(v) => updateExperience(expIndex, { period: v })}
                className="text-sm text-muted-foreground"
                color={getElementColor(`exp-${expIndex}-period`)}
                onColorChange={(c) => setElementColor(`exp-${expIndex}-period`, c)}
              />
            </div>
            {exp.highlights.length > 0 && (
              <div className="space-y-1 mt-2">
                <span className="text-xs text-muted-foreground">Highlights:</span>
                <ul className="space-y-1">
                  {exp.highlights.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <EditableField
                        value={highlight}
                        onChange={(v) => updateExperienceHighlight(expIndex, hIndex, v)}
                        className="text-sm flex-1"
                        color={getElementColor(`exp-${expIndex}-highlight-${hIndex}`)}
                        onColorChange={(c) => setElementColor(`exp-${expIndex}-highlight-${hIndex}`, c)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Opleiding</h4>
        {content.education.map((edu, eduIndex) => (
          <div key={eduIndex} className="space-y-2 p-3 border rounded bg-background">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <EditableField
                  value={edu.degree}
                  onChange={(v) => updateEducation(eduIndex, { degree: v })}
                  className="font-medium"
                  color={getElementColor(`edu-${eduIndex}-degree`)}
                  onColorChange={(c) => setElementColor(`edu-${eduIndex}-degree`, c)}
                />
                <EditableField
                  value={edu.institution}
                  onChange={(v) => updateEducation(eduIndex, { institution: v })}
                  className="text-sm text-muted-foreground"
                  color={getElementColor(`edu-${eduIndex}-institution`)}
                  onColorChange={(c) => setElementColor(`edu-${eduIndex}-institution`, c)}
                />
              </div>
              <EditableField
                value={edu.year}
                onChange={(v) => updateEducation(eduIndex, { year: v })}
                className="text-sm text-muted-foreground"
                color={getElementColor(`edu-${eduIndex}-year`)}
                onColorChange={(c) => setElementColor(`edu-${eduIndex}-year`, c)}
              />
            </div>
            {edu.details && (
              <EditableField
                value={edu.details}
                onChange={(v) => updateEducation(eduIndex, { details: v })}
                className="text-sm text-muted-foreground"
                color={getElementColor(`edu-${eduIndex}-details`)}
                onColorChange={(c) => setElementColor(`edu-${eduIndex}-details`, c)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Vaardigheden</h4>
        <div className="p-3 border rounded bg-background space-y-2">
          <div>
            <span className="text-xs text-muted-foreground">Technisch:</span>
            <p className="text-sm">{content.skills.technical.join(', ')}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Soft skills:</span>
            <p className="text-sm">{content.skills.soft.join(', ')}</p>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Tip: Skills kunnen worden aangepast via de style generator stap
          </p>
        </div>
      </div>
    </div>
  );
}

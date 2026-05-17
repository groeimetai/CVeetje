'use client';

/**
 * Live design-tweaks side-drawer.
 *
 * Behaviour:
 *   - Opens from the right edge over the preview.
 *   - Tabs: Colors | Typography | Layout | Content (level-filtered).
 *   - Every change updates local + parent state immediately (live preview).
 *   - 500ms-debounced PATCH to /api/cv/[id]/tokens persists to Firestore.
 *   - "Reset" button copies originalDesignTokens back into state + PATCH.
 *   - Indicator shows "Opgeslagen" / "Opslaan…" so the user knows the
 *     auto-save is doing its job — no Save button.
 *
 * This component is purely data-driven from `tweak-schema.getVisibleFields(level)`.
 * Adding a new tweakable field means adding one entry in the schema — no
 * change needed here.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleCreativityLevel } from '@/types';
import {
  getVisibleFields,
  fieldsByTab,
  getAtPath,
  setAtPath,
  type TweakField,
  type TweakTab,
} from './tweak-schema';
import {
  ColorControl,
  SelectControl,
  SliderControl,
  ChipsControl,
  TextControl,
} from './controls';

const TAB_LABELS: Record<TweakTab, string> = {
  colors: 'Kleuren',
  typography: 'Typografie',
  layout: 'Layout',
  content: 'Inhoud',
};

interface DesignTweaksSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tokens: CVDesignTokens;
  originalTokens: CVDesignTokens | null;
  creativityLevel: StyleCreativityLevel;
  cvId: string;
  /** Live preview update — fires on every change. */
  onTokensChange: (tokens: CVDesignTokens) => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function DesignTweaksSheet({
  open,
  onOpenChange,
  tokens,
  originalTokens,
  creativityLevel,
  cvId,
  onTokensChange,
}: DesignTweaksSheetProps) {
  const fields = useMemo(() => getVisibleFields(creativityLevel), [creativityLevel]);
  const grouped = useMemo(() => fieldsByTab(fields), [fields]);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick the first tab that actually has at least one field
  const initialTab = (Object.keys(grouped) as TweakTab[])
    .find(t => grouped[t].length > 0) ?? 'colors';

  // Persist to server, debounced. Called from handleChange.
  const persist = useCallback((next: CVDesignTokens) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('dirty');
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        const res = await fetch(`/api/cv/${cvId}/tokens`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designTokens: next }),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        setSaveState('saved');
        // Hide the "Opgeslagen" indicator after a moment
        setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500);
      } catch (e) {
        console.error('[DesignTweaksSheet] save failed', e);
        setSaveState('error');
        toast.error('Tweak kon niet worden opgeslagen — probeer opnieuw');
      }
    }, 500);
  }, [cvId]);

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback((field: TweakField, value: unknown) => {
    const next = setAtPath(tokens, field.path, value);
    onTokensChange(next);
    persist(next);
  }, [tokens, onTokensChange, persist]);

  const handleReset = useCallback(() => {
    if (!originalTokens) return;
    const restored = JSON.parse(JSON.stringify(originalTokens)) as CVDesignTokens;
    onTokensChange(restored);
    persist(restored);
    toast.success('Teruggezet naar originele AI-stijl');
  }, [originalTokens, onTokensChange, persist]);

  const saveLabel: Record<SaveState, string> = {
    idle: '',
    dirty: 'Wijziging…',
    saving: 'Opslaan…',
    saved: 'Opgeslagen',
    error: 'Fout bij opslaan',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[440px]">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle>Tweaks</SheetTitle>
              <SheetDescription>
                Pas kleuren, typografie en stijl direct aan — preview update live.
              </SheetDescription>
            </div>
            {originalTokens && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="shrink-0 gap-1.5 text-xs"
                title="Terug naar originele AI-stijl"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
          {saveLabel[saveState] && (
            <div className="text-xs text-muted-foreground">
              {saveLabel[saveState]}
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue={initialTab} className="mt-4 px-4 pb-6">
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(TAB_LABELS) as TweakTab[]).map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                disabled={grouped[tab].length === 0}
              >
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(TAB_LABELS) as TweakTab[]).map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {grouped[tab].map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={getAtPath(tokens, field.path)}
                  onChange={(v) => handleChange(field, v)}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: TweakField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{field.label}</Label>
      {field.description && (
        <p className="text-[11px] text-muted-foreground">{field.description}</p>
      )}
      <div>{renderControl(field, value, onChange)}</div>
    </div>
  );
}

function renderControl(field: TweakField, value: unknown, onChange: (v: unknown) => void) {
  switch (field.control.kind) {
    case 'color':
      return (
        <ColorControl
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'select':
      return (
        <SelectControl
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          options={field.control.options}
        />
      );
    case 'slider':
      return (
        <SliderControl
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
          min={field.control.min}
          max={field.control.max}
          step={field.control.step}
          suffix={field.control.suffix}
        />
      );
    case 'chips':
      return (
        <ChipsControl
          value={Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []}
          onChange={onChange}
          placeholder={field.control.placeholder}
          max={field.control.max}
        />
      );
    case 'text':
      return (
        <TextControl
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          placeholder={field.control.placeholder}
          multiline={field.control.multiline}
          maxLength={field.control.maxLength}
        />
      );
    default:
      return null;
  }
}

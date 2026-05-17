'use client';

/**
 * Leaf controls for the live design-tweaks panel. Five kinds:
 *   - ColorControl: native <input type="color"> + hex text input
 *   - SelectControl: shadcn Select wrapping options[]
 *   - SliderControl: Radix Slider, single value, shows current
 *   - ChipsControl: tag-input with add/remove for accentKeywords
 *   - TextControl: Input (or Textarea for multiline) with maxLength
 *
 * All controls share a uniform interface so the sheet can render them
 * data-driven from the schema:
 *   <Control value={...} onChange={(v) => ...} />
 *
 * The labels + descriptions are owned by the sheet, not the controls.
 */

import { useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============ Color ============

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function ColorControl({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const safe = typeof value === 'string' && HEX_RE.test(value) ? value : '#000000';
  const [textValue, setTextValue] = useState(safe);

  // Sync external prop changes
  useEffect(() => {
    if (safe !== textValue && HEX_RE.test(safe)) setTextValue(safe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe]);

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
    onChange(e.target.value);
  };

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
    setTextValue(next);
    if (HEX_RE.test(next)) onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={safe}
        onChange={handleColorChange}
        className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
        aria-label="Kleurkiezer"
      />
      <Input
        value={textValue}
        onChange={handleTextChange}
        className="h-8 font-mono text-xs"
        maxLength={7}
        spellCheck={false}
      />
    </div>
  );
}

// ============ Select ============

export function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Kies…" />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============ Slider ============

export function SliderControl({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const safe = typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : (min + max) / 2;
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[safe]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {safe.toFixed(step < 1 ? 1 : 0)}{suffix ?? ''}
      </span>
    </div>
  );
}

// ============ Chips ============

export function ChipsControl({
  value,
  onChange,
  placeholder,
  max = 7,
}: {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const chips = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState('');

  const addChip = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (chips.length >= max) return;
    if (chips.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...chips, trimmed]);
    setDraft('');
  };

  const removeChip = (idx: number) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip();
    } else if (e.key === 'Backspace' && draft === '' && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full',
              'bg-secondary px-2 py-0.5 text-xs',
            )}
          >
            <span>{chip}</span>
            <button
              type="button"
              onClick={() => removeChip(i)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Verwijder ${chip}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addChip}
        placeholder={chips.length >= max ? `Max ${max} bereikt` : (placeholder || 'Voeg toe…')}
        disabled={chips.length >= max}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ============ Text ============

export function TextControl({
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const safe = value || '';
  if (multiline) {
    return (
      <textarea
        value={safe}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm shadow-sm placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
      />
    );
  }
  return (
    <Input
      value={safe}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="h-9 text-sm"
    />
  );
}

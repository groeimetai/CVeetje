'use client';

import { useEffect, useState } from 'react';
import { Settings2, X } from 'lucide-react';
import {
  useAppearance,
  PALETTES,
  DENSITIES,
  FONT_PAIRS,
  type PaletteName,
  type Density,
  type FontPair,
} from '@/components/theme-provider';

const PALETTE_SWATCH: Record<PaletteName, { name: string; trio: [string, string, string] }> = {
  clay:     { name: 'Clay',     trio: ['#1a2540', '#c2410c', '#f7f2e7'] },
  forest:   { name: 'Forest',   trio: ['#1f3a2e', '#b8742a', '#f7f2e7'] },
  ink:      { name: 'Ink',      trio: ['#111418', '#1d3eb8', '#f4f1e8'] },
  marigold: { name: 'Marigold', trio: ['#2a1f0e', '#d18b00', '#fbeec0'] },
};

const FONT_PAIR_LABEL: Record<FontPair, string> = {
  editorial: 'Editorial',
  grotesk:   'Grotesk',
  newspaper: 'Newspaper',
};

const DENSITY_LABEL: Record<Density, string> = {
  compact:     'Compact',
  comfortable: 'Normaal',
  spacious:    'Ruim',
};

export function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, palette, density, fontpair, setTheme, setPalette, setDensity, setFontpair } =
    useAppearance();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const darkOn = theme === 'dark';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tweaks-toggle"
        aria-label={open ? 'Tweaks sluiten' : 'Tweaks openen'}
        aria-expanded={open}
      >
        <Settings2 size={16} />
      </button>

      {open && (
        <aside className="tweaks-panel" role="dialog" aria-label="Appearance tweaks">
          <header className="tweaks-panel__head">
            <strong>Tweaks</strong>
            <button type="button" onClick={() => setOpen(false)} className="tweaks-panel__close" aria-label="Sluiten">
              <X size={14} />
            </button>
          </header>

          <div className="tweaks-panel__body">
            <Section label="Palette" subtitle="Kies de hoofdkleur van Cveetje">
              <div className="tweaks-panel__chips">
                {PALETTES.map((p) => {
                  const trio = PALETTE_SWATCH[p].trio;
                  return (
                    <button
                      key={p}
                      type="button"
                      className="tweaks-panel__chip"
                      data-on={palette === p ? '1' : '0'}
                      onClick={() => setPalette(p)}
                      aria-label={PALETTE_SWATCH[p].name}
                      style={{ background: trio[0] }}
                      title={PALETTE_SWATCH[p].name}
                    >
                      <span>
                        <i style={{ background: trio[1] }} />
                        <i style={{ background: trio[2] }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section label="Typografie" subtitle="Pair van display + body">
              <Segmented
                value={fontpair}
                onChange={(v) => setFontpair(v as FontPair)}
                options={FONT_PAIRS.map((f) => ({ value: f, label: FONT_PAIR_LABEL[f] }))}
              />
            </Section>

            <Section label="Density" subtitle="Hoe ruim alles ademt">
              <Segmented
                value={density}
                onChange={(v) => setDensity(v as Density)}
                options={DENSITIES.map((d) => ({ value: d, label: DENSITY_LABEL[d] }))}
              />
            </Section>

            <Section label="Thema">
              <ToggleRow
                label="Dark mode"
                on={darkOn}
                onChange={(on) => setTheme(on ? 'dark' : 'light')}
              />
              <ToggleRow
                label="Volg systeem"
                on={theme === 'system'}
                onChange={(on) => setTheme(on ? 'system' : 'light')}
              />
            </Section>
          </div>
        </aside>
      )}
    </>
  );
}

function Section({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="tweaks-panel__section">
      <div className="tweaks-panel__sect-label">{label}</div>
      {subtitle && <div className="tweaks-panel__sect-sub">{subtitle}</div>}
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

interface SegOption { value: string; label: string }
function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SegOption[] }) {
  return (
    <div className="tweaks-panel__seg" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          data-on={value === opt.value ? '1' : '0'}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tweaks-panel__row">
      <span>{label}</span>
      <button
        type="button"
        className="tweaks-panel__toggle"
        data-on={on ? '1' : '0'}
        onClick={() => onChange(!on)}
        aria-pressed={on}
        aria-label={label}
      >
        <i />
      </button>
    </label>
  );
}

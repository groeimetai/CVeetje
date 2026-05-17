/**
 * Schema for the live design-tweaks panel.
 *
 * Returns a level-filtered list of fields each rendered by a leaf control
 * (color / select / slider / chips / text). The panel itself is purely
 * data-driven from this schema — adding a new tweakable field means adding
 * one entry here and the renderer picks it up automatically.
 *
 * Only LIVE-SAFE tokens are included (i.e. fields that don't require a
 * DOM-restructure). layoutArchetype / conceptStatement / conceptMotif are
 * intentionally omitted because they need an AI regeneration.
 */

import type { CVDesignTokens, FontPairing } from '@/types/design-tokens';
import type { StyleCreativityLevel } from '@/types';
import { creativityConstraints } from '@/lib/cv/templates/themes';

export type TweakTab = 'colors' | 'typography' | 'layout' | 'content';

export type TweakControl =
  | { kind: 'color' }
  | { kind: 'select'; options: { value: string; label: string }[] }
  | { kind: 'slider'; min: number; max: number; step: number; suffix?: string }
  | { kind: 'chips'; placeholder?: string; max?: number }
  | { kind: 'text'; placeholder?: string; multiline?: boolean; maxLength?: number }
  | { kind: 'toggle' };

export interface TweakField {
  tab: TweakTab;
  key: string;
  label: string;
  description?: string;
  /** Dotted path into CVDesignTokens — e.g. 'colors.primary', 'bold.paletteSaturation'. */
  path: string;
  control: TweakControl;
}

// ============ Shared option lists ============

const fontPairingOptions = (level: StyleCreativityLevel) => {
  const allowed = creativityConstraints[level]?.allowedFontPairings as FontPairing[] | undefined;
  const labelMap: Record<FontPairing, string> = {
    'inter-inter': 'Inter (clean modern)',
    'playfair-inter': 'Playfair + Inter (editorial)',
    'montserrat-open-sans': 'Montserrat + Open Sans',
    'raleway-lato': 'Raleway + Lato',
    'poppins-nunito': 'Poppins + Nunito (rounded)',
    'roboto-roboto': 'Roboto (workhorse)',
    'lato-lato': 'Lato (warm)',
    'merriweather-source-sans': 'Merriweather (serif workhorse)',
    'oswald-source-sans': 'Oswald (condensed impact)',
    'dm-serif-dm-sans': 'DM Serif + DM Sans',
    'space-grotesk-work-sans': 'Space Grotesk (techno)',
    'libre-baskerville-source-sans': 'Libre Baskerville (book)',
  };
  const list = allowed && allowed.length > 0
    ? allowed
    : (Object.keys(labelMap) as FontPairing[]);
  return list.map(v => ({ value: v, label: labelMap[v] || v }));
};

const scaleOptions = [
  { value: 'small', label: 'Klein' },
  { value: 'medium', label: 'Middel' },
  { value: 'large', label: 'Groot' },
];
const spacingOptions = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortabel' },
  { value: 'spacious', label: 'Ruim' },
];
const nameStyleOptions = [
  { value: 'normal', label: 'Normaal' },
  { value: 'uppercase', label: 'Hoofdletters' },
  { value: 'extra-bold', label: 'Extra vet' },
];
const accentStyleOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'border-left', label: 'Rand links' },
  { value: 'background', label: 'Achtergrond' },
  { value: 'quote', label: 'Citaat' },
];
const borderRadiusOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'small', label: 'Klein' },
  { value: 'medium', label: 'Middel' },
  { value: 'large', label: 'Groot' },
  { value: 'pill', label: 'Pill' },
];
const decorationsOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'minimal', label: 'Minimaal' },
  { value: 'moderate', label: 'Gemiddeld' },
  { value: 'abundant', label: 'Uitbundig' },
];

// ===== Bold (experimental) enum options =====
const boldPaletteSaturationOptions = [
  { value: 'monochrome-plus-one', label: 'Mono + één accent' },
  { value: 'duotone', label: 'Duotone' },
  { value: 'tri-tone', label: 'Tri-tone' },
  { value: 'full-palette', label: 'Vol palet' },
];
const boldSurfaceTextureOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'halftone', label: 'Halftone (Toilet Paper)' },
  { value: 'riso-grain', label: 'Riso-grain' },
  { value: 'screen-print', label: 'Screen-print' },
  { value: 'stripe-texture', label: 'Strepen' },
];
const boldBodyDensityOptions = [
  { value: 'whisper', label: 'Whisper (strak)' },
  { value: 'normal', label: 'Normaal' },
  { value: 'shout', label: 'Shout (ruim)' },
];
const boldAsymmetryOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'subtle', label: 'Subtiel' },
  { value: 'strong', label: 'Sterk' },
  { value: 'extreme', label: 'Extreem (Carson)' },
];
const boldNameTreatmentOptions = [
  { value: 'unified', label: 'Eén blok' },
  { value: 'first-name-dominant', label: 'Voornaam groot' },
  { value: 'last-name-dominant', label: 'Achternaam groot' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'separated-by-rule', label: 'Met scheidingsregel' },
  { value: 'first-letter-massive', label: 'Eerste letter massief' },
  { value: 'inline-with-role', label: 'Inline met functie' },
];
const boldGradientDirectionOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'linear-vertical', label: 'Verticaal' },
  { value: 'linear-diagonal', label: 'Diagonaal' },
  { value: 'radial-burst', label: 'Radiaal' },
  { value: 'duotone-split', label: 'Duotone split (riso)' },
  { value: 'offset-clash', label: 'Offset clash' },
];

// ===== Editorial (creative) enum options =====
const editorialColorPolicyOptions = [
  { value: 'mono-accent', label: 'Mono met accent' },
  { value: 'duotone', label: 'Duotone' },
  { value: 'tritone', label: 'Tri-tone' },
];
const editorialPaletteRuleOptions = [
  { value: 'ink-and-paper', label: 'Ink and paper' },
  { value: 'kinfolk-calm', label: 'Kinfolk calm' },
  { value: 'literary-tritone', label: 'Literary tri-tone' },
  { value: 'gallery-restraint', label: 'Gallery restraint' },
  { value: 'ochre-paper', label: 'Ochre paper' },
  { value: 'modernist-clash', label: 'Modernist clash' },
  { value: 'tri-warmth', label: 'Tri-warmth' },
  { value: 'tri-cool', label: 'Tri-cool' },
  { value: 'riso-zine', label: 'Riso zine' },
];
const editorialBodyDensityOptions = [
  { value: 'whisper', label: 'Whisper' },
  { value: 'normal', label: 'Normaal' },
  { value: 'airy', label: 'Airy (Kinfolk)' },
];
const editorialAsymmetryOptions = [
  { value: 'none', label: 'Geen' },
  { value: 'subtle', label: 'Subtiel' },
  { value: 'considered', label: 'Considered (Wallpaper)' },
];

// ============ Field builders ============

function commonFields(level: StyleCreativityLevel): TweakField[] {
  return [
    // Colors tab
    { tab: 'colors', key: 'primary',    label: 'Primair',    path: 'colors.primary',    control: { kind: 'color' } },
    { tab: 'colors', key: 'accent',     label: 'Accent',     path: 'colors.accent',     control: { kind: 'color' } },
    { tab: 'colors', key: 'secondary',  label: 'Secundair (paper)', path: 'colors.secondary', control: { kind: 'color' } },
    { tab: 'colors', key: 'text',       label: 'Tekstkleur', path: 'colors.text',       control: { kind: 'color' } },
    { tab: 'colors', key: 'muted',      label: 'Muted',      path: 'colors.muted',      control: { kind: 'color' } },
    { tab: 'colors', key: 'pageBackground', label: 'Pagina achtergrond', path: 'pageBackground', control: { kind: 'color' } },

    // Typography tab
    { tab: 'typography', key: 'fontPairing', label: 'Font',    path: 'fontPairing', control: { kind: 'select', options: fontPairingOptions(level) } },
    { tab: 'typography', key: 'scale',       label: 'Schaal',  path: 'scale',       control: { kind: 'select', options: scaleOptions } },
    { tab: 'typography', key: 'spacing',     label: 'Spacing', path: 'spacing',     control: { kind: 'select', options: spacingOptions } },
    { tab: 'typography', key: 'nameStyle',   label: 'Naam-stijl', path: 'nameStyle', control: { kind: 'select', options: nameStyleOptions } },

    // Layout tab
    { tab: 'layout', key: 'accentStyle',   label: 'Accent-stijl', path: 'accentStyle',  control: { kind: 'select', options: accentStyleOptions } },
    { tab: 'layout', key: 'borderRadius',  label: 'Hoekafronding', path: 'borderRadius', control: { kind: 'select', options: borderRadiusOptions } },
    { tab: 'layout', key: 'decorations',   label: 'Decoraties',   path: 'decorations',  control: { kind: 'select', options: decorationsOptions } },
  ];
}

function experimentalFields(): TweakField[] {
  return [
    // Layout tab — bold primitives
    { tab: 'layout', key: 'bold.paletteSaturation', label: 'Palet-saturatie', path: 'bold.paletteSaturation', control: { kind: 'select', options: boldPaletteSaturationOptions } },
    { tab: 'layout', key: 'bold.surfaceTexture',    label: 'Textuur',         path: 'bold.surfaceTexture',    control: { kind: 'select', options: boldSurfaceTextureOptions } },
    { tab: 'layout', key: 'bold.gradientDirection', label: 'Gradient',        path: 'bold.gradientDirection', control: { kind: 'select', options: boldGradientDirectionOptions } },
    { tab: 'layout', key: 'bold.nameTreatment',     label: 'Naam-treatment',  path: 'bold.nameTreatment',     control: { kind: 'select', options: boldNameTreatmentOptions } },
    { tab: 'layout', key: 'bold.asymmetryStrength', label: 'Asymmetrie',      path: 'bold.asymmetryStrength', control: { kind: 'select', options: boldAsymmetryOptions } },

    // Typography tab — bold rhythm
    { tab: 'typography', key: 'bold.headingScaleRatio', label: 'Heading scale', description: '1.0 = quiet, 3.0 = brutalist', path: 'bold.headingScaleRatio', control: { kind: 'slider', min: 1.0, max: 4.0, step: 0.1 } },
    { tab: 'typography', key: 'bold.bodyDensity',       label: 'Body-density',  path: 'bold.bodyDensity',       control: { kind: 'select', options: boldBodyDensityOptions } },

    // Content tab — content-driven primitives
    { tab: 'content', key: 'bold.posterLine',        label: 'Poster-zin',      description: 'Zin die oversized op de pagina komt', path: 'bold.posterLine', control: { kind: 'text', multiline: true, maxLength: 200 } },
    { tab: 'content', key: 'bold.heroNumeralValue',  label: 'Hero-numeral',    description: 'Tekst voor het ghosted achtergrond-anker', path: 'bold.heroNumeralValue', control: { kind: 'text', maxLength: 12 } },
    { tab: 'content', key: 'bold.accentKeywords',    label: 'Accent-keywords', description: 'Woorden die accent-kleur krijgen in de tekst', path: 'bold.accentKeywords', control: { kind: 'chips', placeholder: 'Voeg woord toe…', max: 7 } },
  ];
}

function creativeFields(): TweakField[] {
  return [
    // Layout tab — editorial primitives
    { tab: 'layout', key: 'editorial.colorPolicy',   label: 'Kleur-policy',  path: 'editorial.colorPolicy',  control: { kind: 'select', options: editorialColorPolicyOptions } },
    { tab: 'layout', key: 'editorial.paletteRule',   label: 'Palet-regel',   path: 'editorial.paletteRule',  control: { kind: 'select', options: editorialPaletteRuleOptions } },
    { tab: 'layout', key: 'editorial.secondaryColor', label: 'Tweede ontwerpkleur', path: 'editorial.secondaryColor', control: { kind: 'color' } },
    { tab: 'layout', key: 'editorial.asymmetryStrength', label: 'Asymmetrie', path: 'editorial.asymmetryStrength', control: { kind: 'select', options: editorialAsymmetryOptions } },

    // Typography tab — editorial rhythm
    { tab: 'typography', key: 'editorial.headingScaleRatio', label: 'Heading scale', description: '1.0 = modest, 3.0 = poster', path: 'editorial.headingScaleRatio', control: { kind: 'slider', min: 1.0, max: 3.0, step: 0.1 } },
    { tab: 'typography', key: 'editorial.bodyDensity',       label: 'Body-density',  path: 'editorial.bodyDensity',       control: { kind: 'select', options: editorialBodyDensityOptions } },

    // Content tab
    { tab: 'content', key: 'editorial.nameTagline',   label: 'Tagline onder naam', description: 'Bv. "Strategist, writer, gardener"', path: 'editorial.nameTagline', control: { kind: 'text', maxLength: 80 } },
    { tab: 'content', key: 'editorial.pullQuoteText', label: 'Pull-quote tekst',   description: 'De citaat-tekst (max ~30 woorden)', path: 'editorial.pullQuoteText', control: { kind: 'text', multiline: true, maxLength: 280 } },
    { tab: 'content', key: 'editorial.ledeText',      label: 'Lede (openingszin)', description: 'Zin in display-font bij first-line-emphasis', path: 'editorial.ledeText', control: { kind: 'text', multiline: true, maxLength: 220 } },
    { tab: 'content', key: 'editorial.dropCapLetter', label: 'Drop-cap letter',    description: 'Wanneer drop-cap actief is', path: 'editorial.dropCapLetter', control: { kind: 'text', maxLength: 1 } },
    { tab: 'content', key: 'editorial.accentKeywords', label: 'Accent-keywords',   description: 'Woorden die accent-kleur krijgen', path: 'editorial.accentKeywords', control: { kind: 'chips', placeholder: 'Voeg woord toe…', max: 7 } },
  ];
}

// ============ Public API ============

/**
 * Build the full list of tweak-fields for a given creativity level.
 * Returns fields in the order they should appear within each tab.
 */
export function getVisibleFields(level: StyleCreativityLevel): TweakField[] {
  const fields = commonFields(level);
  if (level === 'experimental') {
    fields.push(...experimentalFields());
  } else if (level === 'creative' || level === 'editorial-paper') {
    fields.push(...creativeFields());
  }
  return fields;
}

/**
 * Read a value from CVDesignTokens by dotted path (e.g. 'bold.posterLine').
 * Returns undefined when any segment along the path is missing.
 */
export function getAtPath(tokens: CVDesignTokens, path: string): unknown {
  const parts = path.split('.');
  let cursor: unknown = tokens;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cursor;
}

/**
 * Immutably set a value at a dotted path. Returns a new tokens object;
 * shallow-clones only the spines touched along the path so non-touched
 * subtrees keep their identity (helps React useMemo).
 */
export function setAtPath(tokens: CVDesignTokens, path: string, value: unknown): CVDesignTokens {
  const parts = path.split('.');
  const next: Record<string, unknown> = { ...(tokens as unknown as Record<string, unknown>) };
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const existing = cursor[part];
    cursor[part] = (existing && typeof existing === 'object' && !Array.isArray(existing))
      ? { ...(existing as Record<string, unknown>) }
      : {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  return next as unknown as CVDesignTokens;
}

/** Group fields by tab. */
export function fieldsByTab(fields: TweakField[]): Record<TweakTab, TweakField[]> {
  const out: Record<TweakTab, TweakField[]> = { colors: [], typography: [], layout: [], content: [] };
  for (const f of fields) out[f.tab].push(f);
  return out;
}

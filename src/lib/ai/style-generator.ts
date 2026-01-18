import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type {
  JobVacancy,
  CVStyleConfig,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';

// =============================================================================
// PROGRESSIVE SCHEMAS - 6 STEPS: Layout → Header → Typography → Colors → Skills → Details
// Higher creativity levels have MORE output fields
// =============================================================================

// =============================================================================
// STEP 1: LAYOUT SCHEMAS (Structure only - no header or skill fields)
// =============================================================================

const baseLayoutSchema = z.object({
  sectionDivider: z.enum(['line', 'none', 'accent-bar']),
  spacing: z.enum(['compact', 'normal', 'spacious']),
  sectionOrder: z.array(z.string()),
  showPhoto: z.boolean(),
});

// Layout is minimal - same for all creativity levels
const extendedLayoutSchema = baseLayoutSchema;
const experimentalLayoutSchema = baseLayoutSchema;

// =============================================================================
// STEP 2: HEADER SCHEMAS (Eyecatcher - dedicated header styling)
// =============================================================================

const baseHeaderSchema = z.object({
  headerStyle: z.enum(['centered', 'left-aligned', 'split', 'banner', 'full-width-accent', 'bold-name']),
  headerAccent: z.enum(['none', 'underline', 'side-bar', 'gradient-bar']),
  nameSizePt: z.number(),
});

const extendedHeaderSchema = baseHeaderSchema.extend({
  headerPadding: z.enum(['compact', 'normal', 'spacious']),
  nameLetterSpacing: z.enum(['tight', 'normal', 'wide']),
});

const creativeHeaderSchema = extendedHeaderSchema.extend({
  headerGradientAngle: z.enum(['45', '90', '135', '180']),
  gradientStart: z.string().optional(),
  gradientEnd: z.string().optional(),
});

const experimentalHeaderSchema = creativeHeaderSchema.extend({
  nameTextShadow: z.boolean(),
  headerShadow: z.enum(['none', 'subtle', 'medium']),
  headerGradient: z.enum(['none', 'two-color', 'three-color']),
});

// =============================================================================
// STEP 3: TYPOGRAPHY SCHEMAS (Body content - not name, that's in Header)
// =============================================================================

const baseTypographySchema = z.object({
  headingFont: z.enum(['inter', 'roboto', 'source-sans', 'playfair', 'open-sans']),
  bodyFont: z.enum(['inter', 'roboto', 'source-sans', 'open-sans']),
  headingSizePt: z.number(),
  bodySizePt: z.number(),
  lineHeight: z.number(),
});

const extendedTypographySchema = baseTypographySchema.extend({
  sectionTitleLetterSpacing: z.enum(['none', 'subtle', 'wide']),
});

// Typography stays the same for creative/experimental
const experimentalTypographySchema = extendedTypographySchema;

// =============================================================================
// STEP 4: COLORS SCHEMAS (Palette - gradient colors now in Header)
// =============================================================================

const baseColorsSchema = z.object({
  styleName: z.string(),
  industryFit: z.string(),
  styleRationale: z.string(),
  formalityLevel: z.enum(['casual', 'professional', 'formal']),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  text: z.string(),
  muted: z.string(),
});

// Extended is same as base for colors now (gradients moved to Header)
const extendedColorsSchema = baseColorsSchema;

const experimentalColorsSchema = baseColorsSchema.extend({
  accentSecondary: z.string().optional(),
});

// =============================================================================
// STEP 5: SKILLS SCHEMAS (Dedicated skill display options)
// =============================================================================

const baseSkillsSchema = z.object({
  skillDisplay: z.enum(['tags', 'list', 'grid', 'bars', 'chips', 'categories-with-icons', 'progress-dots']),
  skillTagVariant: z.enum(['outlined', 'filled', 'ghost', 'gradient']),
});

const extendedSkillsSchema = baseSkillsSchema.extend({
  skillCategoryStyle: z.enum(['none', 'header', 'divider', 'badge']),
});

const creativeSkillsSchema = extendedSkillsSchema.extend({
  softSkillsStyle: z.enum(['same', 'italic', 'separate-section', 'hidden']),
  skillTagSize: z.enum(['compact', 'normal', 'large']),
});

const experimentalSkillsSchema = creativeSkillsSchema.extend({
  skillGrouping: z.enum(['none', 'by-category', 'by-proficiency']),
});

// =============================================================================
// STEP 6: DETAILS SCHEMAS (Finishing touches - no header fields)
// =============================================================================

const baseDetailsSchema = z.object({
  itemStyle: z.enum(['inline', 'card-subtle', 'accent-left']),
  cornerStyle: z.enum(['sharp', 'rounded']),
  intensity: z.enum(['subtle', 'moderate', 'bold']),
  useBorders: z.boolean(),
  useBackgrounds: z.boolean(),
  iconStyle: z.enum(['none', 'minimal', 'filled']),
});

const extendedDetailsSchema = baseDetailsSchema.extend({
  itemBorderWidth: z.enum(['thin', 'normal', 'thick']).optional(),
  summaryStyle: z.enum(['none', 'border-left', 'background', 'border-left-gradient']),
  itemShadow: z.enum(['none', 'subtle', 'layered']),
});

// Experimental details no longer has header fields (moved to Header step)
const experimentalDetailsSchema = extendedDetailsSchema;

// =============================================================================
// SCHEMA SELECTION FUNCTIONS
// =============================================================================

function getLayoutSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
    case 'balanced':
      return baseLayoutSchema;
    case 'creative':
      return extendedLayoutSchema;
    case 'experimental':
      return experimentalLayoutSchema;
  }
}

function getHeaderSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseHeaderSchema;
    case 'balanced':
      return extendedHeaderSchema;
    case 'creative':
      return creativeHeaderSchema;
    case 'experimental':
      return experimentalHeaderSchema;
  }
}

function getTypographySchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseTypographySchema;
    case 'balanced':
    case 'creative':
    case 'experimental':
      return extendedTypographySchema;
  }
}

function getColorsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
    case 'balanced':
    case 'creative':
      return baseColorsSchema;
    case 'experimental':
      return experimentalColorsSchema;
  }
}

function getSkillsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
    case 'balanced':
      return baseSkillsSchema;
    case 'creative':
      return creativeSkillsSchema;
    case 'experimental':
      return experimentalSkillsSchema;
  }
}

function getDetailsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
    case 'balanced':
      return baseDetailsSchema;
    case 'creative':
    case 'experimental':
      return extendedDetailsSchema;
  }
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

function buildContextPrompt(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  userPreferences?: string,
): string {
  let context = `## Candidate Profile:\n${linkedInSummary}\n`;

  if (jobVacancy) {
    context += `\n## Target Job:\nTitle: ${jobVacancy.title}\n`;
    if (jobVacancy.company) context += `Company: ${jobVacancy.company}\n`;
    context += `Description: ${jobVacancy.description.substring(0, 500)}...\n`;
  }

  if (userPreferences) {
    context += `\n## User Preferences: ${userPreferences}\n`;
  }

  return context;
}

// =============================================================================
// STEP 1: LAYOUT PROMPTS PER CREATIVITY LEVEL
// =============================================================================

const layoutPrompts: Record<StyleCreativityLevel, (context: string) => string> = {
  conservative: (context) => `Je bent een CV-ontwerper voor TRADITIONELE bedrijven (banken, overheid, verzekeraars, consultancy).

${context}

## LAYOUT KEUZES - Conservative (Structuur)

### sectionDivider
KIES UIT: 'line' of 'none'
- 'line': Simpele horizontale lijn, professioneel
- 'none': Ultra minimalistisch

NIET GEBRUIKEN: 'accent-bar' (te opvallend)

### spacing
ALTIJD: 'normal'
(Geen ruimte verspillen, efficiënte lay-out)

### showPhoto
- true voor EU posities (Nederland, België, Duitsland)
- false voor US/UK posities

### sectionOrder
STANDAARD: ["summary", "experience", "education", "skills", "certifications", "languages"]`,

  balanced: (context) => `Je bent een CV-ontwerper voor MODERNE PROFESSIONELE bedrijven (tech enterprises, scale-ups, moderne consultancy).

${context}

## LAYOUT KEUZES - Balanced (Structuur)

### sectionDivider
KIES UIT: 'line' of 'accent-bar'
- 'line': Altijd goed, professioneel
- 'accent-bar': Iets meer persoonlijkheid voor tech bedrijven

### spacing
KIES: 'normal'

### showPhoto
- true voor EU posities
- false voor US/UK

### sectionOrder
- Tech rollen: ["summary", "skills", "experience", "education", "certifications", "languages"]
- Andere rollen: ["summary", "experience", "education", "skills", "certifications", "languages"]`,

  creative: (context) => `Je bent een CV-ontwerper voor MODERNE TECH bedrijven en startups (SaaS, scale-ups, innovatieve bedrijven).

${context}

## LAYOUT KEUZES - Creative (Structuur)

### sectionDivider
KIES: 'accent-bar'
(Voegt visueel interest toe zonder druk te zijn)

### spacing
KIES: 'normal' of 'spacious'
- 'spacious' voor creatievere bedrijven met meer ademruimte

### showPhoto
- true voor EU
- false voor US/UK

### sectionOrder
["summary", "skills", "experience", "education", "certifications", "languages"]
(Skills eerst voor tech rollen - dat is waar recruiters naar kijken)`,

  experimental: (context) => `Je bent een CV-ontwerper voor CREATIEVE en DESIGN bedrijven (agencies, startups, design studios).

${context}

## LAYOUT KEUZES - Experimental (Structuur)

### sectionDivider
KIES: 'accent-bar'
(Past bij de visueel rijkere stijl)

### spacing
KIES: 'spacious'
(Meer ademruimte voor visuele impact)

### showPhoto
- true (foto's werken goed bij creatieve bedrijven)

### sectionOrder
Flexibel - prioriteer wat relevant is voor de rol
Voor designers: ["summary", "skills", "experience", "education", "certifications", "languages"]`,
};

// =============================================================================
// STEP 2: HEADER PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type LayoutResult = z.infer<typeof baseLayoutSchema>;

const headerPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult) => string> = {
  conservative: (context, layout) => `Je bent een header-ontwerper voor TRADITIONELE CVs. De header is het eerste wat recruiters zien!

${context}

## Huidige Layout:
- Spacing: ${layout.spacing}
- Divider: ${layout.sectionDivider}

## HEADER KEUZES - Conservative

### headerStyle
KIES UIT: 'left-aligned' of 'centered'
- 'left-aligned': Standaard professioneel, ATS-proof, werkt altijd
- 'centered': Formeler, geschikt voor senior posities

NIET GEBRUIKEN: 'banner', 'full-width-accent', 'bold-name', 'split'
(Te creatief/modern voor traditionele bedrijven)

### headerAccent
KIES: 'none' of 'underline'
- 'none': Ultra minimalistisch
- 'underline': Subtiele lijn onder de naam (AANBEVOLEN)

### nameSizePt
KIES: 24 (standaard professioneel formaat)`,

  balanced: (context, layout) => `Je bent een header-ontwerper voor MODERNE PROFESSIONELE CVs. De header is de eyecatcher!

${context}

## Huidige Layout:
- Spacing: ${layout.spacing}
- Divider: ${layout.sectionDivider}

## HEADER KEUZES - Balanced

### headerStyle
KIES AFHANKELIJK VAN BEDRIJF:
- 'left-aligned': Default voor de meeste bedrijven, altijd goed
- 'centered': Voor formele sectoren (finance, legal)
- 'split': Modern maar professioneel (naam links, contact rechts)

NIET GEBRUIKEN: 'bold-name', 'full-width-accent' (te creatief)

### headerAccent
KIES: 'underline' (AANBEVOLEN)
- Subtiele gekleurde lijn onder de naam/sectie titels

### nameSizePt
KIES: 24-26 (iets meer aanwezigheid toegestaan)

## EXTRA VELDEN (Balanced niveau)

### headerPadding
Hoeveel ruimte in de header:
- 'compact': Strakke header, meer ruimte voor content
- 'normal': Gebalanceerd (AANBEVOLEN)
- 'spacious': Meer ademruimte

### nameLetterSpacing
- 'tight': Modern, Apple-stijl (-0.025em)
- 'normal': Standaard
- 'wide': Meer open, traditioneler`,

  creative: (context, layout) => `Je bent een header-ontwerper voor MODERNE TECH CVs. De header is DE eyecatcher van het CV!

${context}

## Huidige Layout:
- Spacing: ${layout.spacing}
- Divider: ${layout.sectionDivider}

## HEADER KEUZES - Creative

### headerStyle
OPTIES:
- 'left-aligned': Nog steeds prima voor enterprise tech
- 'split': Modern, efficiënt, professioneel
- 'banner': Full-width gekleurde header (LET OP: primary kleur moet DONKER zijn voor witte tekst!)

### headerAccent
KIES: 'underline' of 'gradient-bar'

### nameSizePt
KIES: 26-28 (grotere naam voor meer impact)

## EXTRA VELDEN (Creative niveau)

### headerPadding
KIES: 'normal' of 'spacious'

### nameLetterSpacing
KIES: 'tight' (modern, premium)

### headerGradientAngle
Gradient richting voor banner/full-width-accent headers:
- '45': Diagonaal van linksboven naar rechtsonder (DYNAMISCH)
- '90': Horizontaal van links naar rechts
- '135': Diagonaal van rechtsboven naar linksonder
- '180': Verticaal van boven naar onder

### gradientStart (optioneel)
Startkleur voor header gradient - typisch donkerder dan primary of gelijk aan primary

### gradientEnd (optioneel)
Eindkleur voor header gradient - typisch accent kleur of lichter dan primary`,

  experimental: (context, layout) => `Je bent een header-ontwerper voor CREATIEVE CVs. De header is DE statement maker!

${context}

## Huidige Layout:
- Spacing: ${layout.spacing}
- Divider: ${layout.sectionDivider}

## HEADER KEUZES - Experimental

### headerStyle
ALLE OPTIES BESCHIKBAAR:
- 'banner': Bold statement met volle kleur header
- 'full-width-accent': Premium gradient bar bovenaan
- 'bold-name': Oversized naam voor designers en creatieven
- 'split': Modern en clean, naam links, contact rechts

### headerAccent
KIES: 'gradient-bar' of 'side-bar' (premium look)

### nameSizePt
KIES: 28-32 (statement maken)

## EXTRA VELDEN (Experimental niveau)

### headerPadding
KIES: 'spacious' voor maximale visuele impact

### nameLetterSpacing
KIES: 'tight' of 'wide' (afhankelijk van stijl)
- 'tight' voor modern: Apple-stijl
- 'wide' voor elegant: meer luxe uitstraling

### headerGradientAngle
KIES: '45' of '135' voor dynamische gradients

### gradientStart
Startkleur voor gradient (donkerder, primary-gebaseerd)

### gradientEnd
Eindkleur voor gradient (lichter, accent-gebaseerd)

### nameTextShadow
KIES afhankelijk van header:
- true: Bij banner of full-width-accent met donkere achtergrond (voegt definitie toe)
- false: Bij light headers

### headerShadow
- 'none': Clean, flat design
- 'subtle': Zachte lift (premium look)
- 'medium': Meer aanwezigheid, dramatischer

### headerGradient
- 'none': Solid kleur
- 'two-color': primary→accent gradient (AANBEVOLEN)
- 'three-color': Rijker, meer dramatisch`,
};

// =============================================================================
// STEP 3: TYPOGRAPHY PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type HeaderResult = z.infer<typeof baseHeaderSchema> | z.infer<typeof extendedHeaderSchema> | z.infer<typeof creativeHeaderSchema> | z.infer<typeof experimentalHeaderSchema>;

const typographyPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult) => string> = {
  conservative: (context, layout, header) => `Je bent een typografie-expert voor TRADITIONELE CVs.

${context}

## Huidige Design:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Spacing: ${layout.spacing}

## TYPOGRAPHY KEUZES - Conservative (Body Content)

### headingFont
KIES: 'inter' (aanbevolen) of 'source-sans'
- Inter: Modern maar professioneel, uitstekende leesbaarheid
- Source Sans: Klassiek, betrouwbaar

NIET GEBRUIKEN: 'playfair' (te decoratief voor traditionele bedrijven)

### bodyFont
KIES: 'inter' of 'source-sans'
(Zelfde als headingFont voor consistentie)

### headingSizePt
KIES: 12 (duidelijk maar niet overdreven)

### bodySizePt
KIES: 10 (goed leesbaar, standaard)

### lineHeight
KIES: 1.5 (optimaal voor leesbaarheid)`,

  balanced: (context, layout, header) => `Je bent een typografie-expert voor MODERNE PROFESSIONELE CVs.

${context}

## Huidige Design:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Spacing: ${layout.spacing}

## TYPOGRAPHY KEUZES - Balanced (Body Content)

### headingFont
KIES AFHANKELIJK VAN INDUSTRIE:
- 'inter': Default, modern professioneel
- 'roboto': Google-stijl, tech bedrijven
- 'open-sans': Vriendelijk, toegankelijk

### bodyFont
KIES: Zelfde familie als headingFont voor harmonie

### headingSizePt
KIES: 12-13

### bodySizePt
KIES: 10

### lineHeight
KIES: 1.5

## EXTRA VELDEN (Balanced niveau)

### sectionTitleLetterSpacing
- 'none': Geen extra spacing
- 'subtle': Verfijnde touch (AANBEVOLEN)
- 'wide': Meer nadruk`,

  creative: (context, layout, header) => `Je bent een typografie-expert voor MODERNE TECH CVs.

${context}

## Huidige Design:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Spacing: ${layout.spacing}

## TYPOGRAPHY KEUZES - Creative (Body Content)

### headingFont
OPTIES:
- 'inter': Altijd goed, premium uitstraling
- 'playfair': Serif voor creatieve rollen (let op: alleen voor headers!)
- 'roboto': Clean, tech

### bodyFont
KIES: 'inter', 'roboto', of 'open-sans'
(Altijd sans-serif voor body text)

### headingSizePt
KIES: 12-14

### bodySizePt
KIES: 10

### lineHeight
KIES: 1.5-1.6

## EXTRA VELDEN (Creative niveau)

### sectionTitleLetterSpacing
KIES: 'subtle' of 'wide'`,

  experimental: (context, layout, header) => `Je bent een typografie-expert voor CREATIEVE CVs.

${context}

## Huidige Design:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Spacing: ${layout.spacing}

## TYPOGRAPHY KEUZES - Experimental (Body Content)

### headingFont
ALLE OPTIES:
- 'playfair': Elegante serif, perfect voor creatieve rollen
- 'inter': Modern sans-serif
- 'roboto': Clean tech

### bodyFont
KIES: 'inter' of 'open-sans' (sans-serif blijft beste voor body)

### headingSizePt
KIES: 13-14

### bodySizePt
KIES: 10

### lineHeight
KIES: 1.5-1.6

## EXTRA VELDEN (Experimental niveau)

### sectionTitleLetterSpacing
KIES: 'subtle' of 'wide'`,
};

// =============================================================================
// STEP 4: COLORS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type TypographyResult = z.infer<typeof baseTypographySchema> | z.infer<typeof extendedTypographySchema>;

const colorsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult) => string> = {
  conservative: (context, layout, header, typography) => `Je bent een kleur-expert voor TRADITIONELE CVs.

${context}

## Huidige Keuzes:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}

## KLEUREN KEUZES - Conservative

### INDUSTRY-SPECIFIEKE PALETTEN

#### Finance / Banking / Insurance / Consulting
- **Deep Navy**: primary=#0f172a, secondary=#f8fafc, accent=#1e40af
- **Charcoal**: primary=#1f2937, secondary=#f9fafb, accent=#374151

#### Government / Non-profit / Legal
- **Classic Blue**: primary=#1e3a5f, secondary=#f1f5f9, accent=#2c5282
- **Navy**: primary=#1e3a8a, secondary=#f8fafc, accent=#3b82f6

### KLEUR REGELS

1. **primary**: DONKERE kleur voor headers, section titles
2. **secondary**: ZEER LICHTE tint (bijna wit) - achtergronden
3. **accent**: HELDERE versie van primary - links, highlights
4. **text**: ALTIJD #1e293b (dark slate voor leesbaarheid)
5. **muted**: ALTIJD #64748b (grijs voor secundaire tekst)

### styleName
Beschrijf de stijl in 2-3 woorden (bijv. "Classic Navy Professional")

### industryFit
De industrie waarvoor dit past (bijv. "Finance, Banking, Consulting")

### styleRationale
Korte uitleg waarom deze kleuren passen bij de vacature

### formalityLevel
KIES: 'formal' (altijd voor conservative)`,

  balanced: (context, layout, header, typography) => `Je bent een kleur-expert voor MODERNE PROFESSIONELE CVs.

${context}

## Huidige Keuzes:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}

## KLEUREN KEUZES - Balanced

### INDUSTRY-SPECIFIEKE PALETTEN

#### Tech / SaaS / Software
- **Modern Blue**: primary=#1e40af, secondary=#f0f9ff, accent=#3b82f6
- **Indigo**: primary=#4f46e5, secondary=#eef2ff, accent=#6366f1
- **Slate**: primary=#334155, secondary=#f8fafc, accent=#475569

#### Healthcare / Pharma
- **Teal**: primary=#0d9488, secondary=#f0fdfa, accent=#14b8a6
- **Blue-Green**: primary=#0891b2, secondary=#ecfeff, accent=#06b6d4

#### Finance / Consulting (modern)
- **Deep Blue**: primary=#1e40af, secondary=#eff6ff, accent=#2563eb
- **Slate Blue**: primary=#334155, secondary=#f8fafc, accent=#64748b

### KLEUR REGELS

1. **primary**: DONKERE kleur - moet contrasteren met wit
2. **secondary**: ZEER LICHT - bijna wit maar met tint van primary
3. **accent**: HELDERE versie - voor interactieve elementen
4. **text**: #1e293b (donker voor leesbaarheid)
5. **muted**: #64748b (grijs voor secundaire info)

### styleName, industryFit, styleRationale, formalityLevel
Vul in zoals bij conservative, maar formalityLevel mag 'professional' zijn`,

  creative: (context, layout, header, typography) => `Je bent een kleur-expert voor MODERNE TECH CVs.

${context}

## Huidige Keuzes:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}

## KLEUREN KEUZES - Creative

### UITGEBREIDE PALETTEN

#### Tech / Startups
- **Modern Blue**: primary=#1e40af, secondary=#f0f9ff, accent=#3b82f6
- **Indigo**: primary=#4f46e5, secondary=#eef2ff, accent=#6366f1
- **Violet**: primary=#6d28d9, secondary=#faf5ff, accent=#7c3aed

#### Creative / Design / Marketing
- **Emerald**: primary=#059669, secondary=#ecfdf5, accent=#10b981
- **Rose**: primary=#be185d, secondary=#fdf2f8, accent=#ec4899
- **Violet**: primary=#6d28d9, secondary=#faf5ff, accent=#7c3aed

### KLEUR REGELS

1. **primary**: DONKER - essentieel voor banner headers!
2. **secondary**: ZEER LICHT - subtiele achtergrond
3. **accent**: HELDER - voor highlights en links
4. **text**: #1e293b
5. **muted**: #64748b

### formalityLevel
KIES: 'professional' of 'casual' afhankelijk van bedrijf`,

  experimental: (context, layout, header, typography) => `Je bent een kleur-expert voor CREATIEVE CVs.

${context}

## Huidige Keuzes:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}

## KLEUREN KEUZES - Experimental

### VOLLEDIGE CREATIEVE VRIJHEID

#### Alle paletten beschikbaar:
- **Violet**: primary=#6d28d9, secondary=#faf5ff, accent=#7c3aed
- **Emerald**: primary=#059669, secondary=#ecfdf5, accent=#10b981
- **Rose**: primary=#be185d, secondary=#fdf2f8, accent=#ec4899
- **Amber**: primary=#d97706, secondary=#fffbeb, accent=#f59e0b
- **Cyan**: primary=#0891b2, secondary=#ecfeff, accent=#06b6d4

### KLEUR HARMONIE PRINCIPES

1. **primary + accent**: Moeten uit dezelfde kleurfamilie komen
2. **secondary**: Altijd zeer licht (bijna wit) met tint van primary
3. **Geen clashende kleuren**: Oranje+teal, rood+blauw = NOOIT

## EXTRA VELDEN (Experimental niveau)

### accentSecondary (optioneel)
Tweede accent kleur voor extra visuele variatie

### formalityLevel
KIES: 'professional' of 'casual' gebaseerd op bedrijfscultuur`,
};

// =============================================================================
// STEP 5: SKILLS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type ColorsResult = z.infer<typeof baseColorsSchema> | z.infer<typeof experimentalColorsSchema>;

const skillsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult, colors: ColorsResult) => string> = {
  conservative: (context, layout, header, typography, colors) => `Je bent een skills-weergave expert voor TRADITIONELE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}

## SKILLS KEUZES - Conservative

### skillDisplay
KIES: 'tags' of 'list'
- 'tags': Compacte weergave, moderne uitstraling, ruimte-efficiënt
- 'list': Traditioneler, duidelijke opsomming

NIET GEBRUIKEN: 'grid', 'bars', 'chips', 'categories-with-icons', 'progress-dots'
(Te creatief voor traditionele bedrijven)

### skillTagVariant
KIES: 'outlined' of 'ghost'
- 'outlined': Clean borders, professioneel (AANBEVOLEN)
- 'ghost': Zeer subtiel, minimalistisch

NIET GEBRUIKEN: 'filled', 'gradient' (te opvallend)`,

  balanced: (context, layout, header, typography, colors) => `Je bent een skills-weergave expert voor MODERNE PROFESSIONELE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}

## SKILLS KEUZES - Balanced

### skillDisplay
KIES: 'tags' of 'chips'
- 'tags': Klassieke skill tags, werkt altijd (AANBEVOLEN)
- 'chips': Afgeronde pill-shaped tags, modern UI gevoel

### skillTagVariant
KIES: 'outlined' of 'filled'
- 'outlined': Clean borders, transparante achtergrond (AANBEVOLEN)
- 'filled': Gevulde achtergrond, meer nadruk

## EXTRA VELDEN (Balanced niveau)

### skillCategoryStyle
Hoe worden skill categorieën (Technical vs Soft) getoond:
- 'none': Geen onderscheid, alle skills samen
- 'header': Categorie naam als header boven skills (AANBEVOLEN)
- 'divider': Simpele lijn tussen categorieën
- 'badge': Categorie als badge/label`,

  creative: (context, layout, header, typography, colors) => `Je bent een skills-weergave expert voor MODERNE TECH CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}

## SKILLS KEUZES - Creative

### skillDisplay
OPTIES:
- 'tags': Klassieke skill tags, werkt altijd
- 'chips': Afgeronde pill-shaped tags, modern UI
- 'grid': Grid layout, gestructureerd overzicht
- 'categories-with-icons': Gegroepeerd met iconen (💻 Technical, 🤝 Soft)

### skillTagVariant
KIES: 'outlined', 'filled', of 'gradient'
- 'gradient': Premium gradient effect (past bij creative niveau)

## EXTRA VELDEN (Creative niveau)

### skillCategoryStyle
KIES: 'header' of 'badge'

### softSkillsStyle
Hoe worden soft skills anders getoond dan technical:
- 'same': Zelfde stijl als technical skills
- 'italic': Cursief voor subtiel onderscheid
- 'separate-section': Eigen sectie, duidelijke scheiding
- 'hidden': Verberg soft skills (voor pure tech CVs)

### skillTagSize
- 'compact': Kleinere tags, meer passen op een regel
- 'normal': Standaard grootte (AANBEVOLEN)
- 'large': Grotere, prominentere tags`,

  experimental: (context, layout, header, typography, colors) => `Je bent een skills-weergave expert voor CREATIEVE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}

## SKILLS KEUZES - Experimental

### skillDisplay
ALLE OPTIES BESCHIKBAAR:
- 'tags': Klassieke skill tags
- 'chips': Afgeronde pill-shaped tags
- 'grid': Grid layout
- 'bars': Progress bars voor niveau weergave
- 'categories-with-icons': Met iconen per categorie
- 'progress-dots': Stipjes voor niveau (●●●○○ = 3/5)

### skillTagVariant
KIES: 'filled' of 'gradient' voor maximale visuele impact

## EXTRA VELDEN (Experimental niveau)

### skillCategoryStyle
KIES: 'badge' (meest visueel distinctief)

### softSkillsStyle
KIES afhankelijk van rol:
- 'separate-section': Voor rollen waar soft skills belangrijk zijn
- 'italic': Voor subtiel onderscheid
- 'hidden': Voor pure tech/design rollen

### skillTagSize
KIES: 'normal' of 'large'

### skillGrouping
- 'none': Geen groepering, alle skills samen
- 'by-category': Groepeer op technical/soft/tools/etc.
- 'by-proficiency': Groepeer op expert/advanced/intermediate`,
};

// =============================================================================
// STEP 6: DETAILS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type SkillsResult = z.infer<typeof baseSkillsSchema> | z.infer<typeof extendedSkillsSchema> | z.infer<typeof creativeSkillsSchema> | z.infer<typeof experimentalSkillsSchema>;

const detailsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult, colors: ColorsResult, skills: SkillsResult) => string> = {
  conservative: (context, layout, header, typography, colors, skills) => `Je bent een detail-expert voor TRADITIONELE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}
- Skills display: ${skills.skillDisplay}

## DETAILS KEUZES - Conservative (Finishing Touches)

### itemStyle
KIES: 'inline' of 'card-subtle'
- 'inline': Geen decoratie, pure tekst (meest conservatief, ATS-proof)
- 'card-subtle': Zeer lichte achtergrond, subtiel maar professioneel

NIET GEBRUIKEN: 'accent-left' (te modern)

### cornerStyle
KIES: 'sharp'
(Afgeronde hoeken zijn te casual voor traditionele bedrijven)

### intensity
ALTIJD: 'subtle'

### useBorders
KIES: false (borders zien er goedkoop uit)

### useBackgrounds
KIES: false (gekleurde secties zijn gedateerd)

### iconStyle
KIES: 'none' of 'minimal'`,

  balanced: (context, layout, header, typography, colors, skills) => `Je bent een detail-expert voor MODERNE PROFESSIONELE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}
- Skills display: ${skills.skillDisplay}

## DETAILS KEUZES - Balanced (Finishing Touches)

### itemStyle
KIES: 'card-subtle' (AANBEVOLEN)
- Zeer lichte achtergrond achter experience items
- Creëert visuele scheiding zonder af te leiden
- Think: Notion, Linear - clean cards

### cornerStyle
KIES: 'rounded' voor moderne bedrijven, 'sharp' voor traditioneler

### intensity
KIES: 'subtle'

### useBorders
KIES: false

### useBackgrounds
KIES: false

### iconStyle
KIES: 'none' of 'minimal'`,

  creative: (context, layout, header, typography, colors, skills) => `Je bent een detail-expert voor MODERNE TECH CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}
- Skills display: ${skills.skillDisplay}

## DETAILS KEUZES - Creative (Finishing Touches)

### itemStyle
KIES: 'card-subtle' of 'accent-left'
- 'card-subtle': Lichte achtergrond, professioneel
- 'accent-left': Gekleurde lijn links van items (modern, tech-stijl)

### cornerStyle
KIES: 'rounded' (modern, vriendelijk)

### intensity
KIES: 'subtle' of 'moderate'

### useBorders, useBackgrounds
KIES: false

### iconStyle
KIES: 'minimal'

## EXTRA VELDEN (Creative niveau)

### itemBorderWidth (bij accent-left)
- 'thin': 2px - subtiel
- 'normal': 4px - zichtbaar

### summaryStyle
- 'border-left': Clean accent lijn links van summary (AANBEVOLEN)
- 'background': Subtiele card achtergrond
- 'border-left-gradient': Premium gradient accent

### itemShadow
- 'none': Plat design
- 'subtle': Zachte schaduw (premium look)
- 'layered': Meerdere schaduwen gestapeld (Apple-stijl)`,

  experimental: (context, layout, header, typography, colors, skills) => `Je bent een detail-expert voor CREATIEVE CVs.

${context}

## Huidige Design:
- Header: ${header.headerStyle}
- Font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl: ${colors.styleName}
- Skills display: ${skills.skillDisplay}

## DETAILS KEUZES - Experimental (Finishing Touches)

### itemStyle
KIES: 'accent-left' (AANBEVOLEN voor visuele impact)

### cornerStyle
KIES: 'rounded'

### intensity
KIES: 'moderate'

### useBorders, useBackgrounds
KIES: false (nog steeds)

### iconStyle
KIES: 'minimal'

## EXTRA VELDEN (Experimental niveau)

### itemBorderWidth
KIES: 'normal' (4px voor duidelijke zichtbaarheid)

### summaryStyle
KIES: 'border-left-gradient' (premium look)

### itemShadow
KIES: 'layered' (gestapelde schaduwen voor depth)`,
};

// =============================================================================
// CSS GENERATION HELPERS
// =============================================================================

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface CSSOptions {
  headerGradient?: 'none' | 'two-color' | 'three-color';
  headerShadow?: 'none' | 'subtle' | 'medium';
  itemShadow?: 'none' | 'subtle' | 'layered';
  summaryStyle?: 'none' | 'border-left' | 'background' | 'border-left-gradient';
  nameLetterSpacing?: 'tight' | 'normal' | 'wide';
  sectionTitleLetterSpacing?: 'none' | 'subtle' | 'wide';
  nameTextShadow?: boolean;
  headerPadding?: 'compact' | 'normal' | 'spacious';
  skillTagSize?: 'compact' | 'normal' | 'large';
  skillCategoryStyle?: 'none' | 'header' | 'divider' | 'badge';
}

function generateCustomCSS(
  options: CSSOptions,
  colors: { primary: string; secondary: string; accent: string }
): Record<string, string | undefined> {
  const { primary, secondary, accent } = colors;
  const css: Record<string, string | undefined> = {};

  // Header CSS
  const headerParts: string[] = [];
  if (options.headerGradient === 'two-color') {
    headerParts.push(`background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`);
  } else if (options.headerGradient === 'three-color') {
    headerParts.push(`background: linear-gradient(135deg, ${primary} 0%, ${accent} 60%, ${adjustColorBrightness(accent, 20)} 100%)`);
  }
  if (options.headerShadow === 'subtle') {
    headerParts.push('box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)');
  } else if (options.headerShadow === 'medium') {
    headerParts.push('box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)');
  }
  const paddingMap = { compact: '1.5rem 2rem', normal: '2rem 2.5rem', spacious: '2.5rem 3rem' };
  if (options.headerPadding) {
    headerParts.push(`padding: ${paddingMap[options.headerPadding]}`);
  }
  if (headerParts.length > 0) {
    css.headerCSS = headerParts.join('; ') + ';';
  }

  // Item CSS
  const itemParts: string[] = [];
  if (options.itemShadow === 'subtle') {
    itemParts.push('box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03)');
  } else if (options.itemShadow === 'layered') {
    itemParts.push('box-shadow: 0 1px 2px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.03)');
  }
  if (itemParts.length > 0) {
    css.itemCSS = itemParts.join('; ') + ';';
  }

  // Name CSS
  const nameParts: string[] = [];
  const letterSpacingMap = { tight: '-0.025em', normal: '-0.01em', wide: '0.01em' };
  if (options.nameLetterSpacing) {
    nameParts.push(`letter-spacing: ${letterSpacingMap[options.nameLetterSpacing]}`);
  }
  if (options.nameTextShadow) {
    nameParts.push('text-shadow: 0 1px 2px rgba(0,0,0,0.08)');
  }
  nameParts.push('-webkit-font-smoothing: antialiased');
  css.nameCSS = nameParts.join('; ') + ';';

  // Section Title CSS
  const titleParts: string[] = [];
  const titleSpacingMap = { none: '0.02em', subtle: '0.05em', wide: '0.1em' };
  if (options.sectionTitleLetterSpacing) {
    titleParts.push(`letter-spacing: ${titleSpacingMap[options.sectionTitleLetterSpacing]}`);
  }
  titleParts.push('text-transform: uppercase');
  titleParts.push('font-weight: 600');
  titleParts.push(`color: ${primary}`);
  titleParts.push(`border-bottom: 2px solid ${accent}`);
  titleParts.push('padding-bottom: 0.5rem');
  titleParts.push('margin-bottom: 1.25rem');
  css.sectionTitleCSS = titleParts.join('; ') + ';';

  // Summary CSS
  if (options.summaryStyle === 'border-left') {
    css.summaryCSS = `border-left: 3px solid ${accent}; padding-left: 1.25rem; margin-left: 0;`;
  } else if (options.summaryStyle === 'background') {
    css.summaryCSS = `background: ${secondary}; padding: 1.25rem 1.5rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.03);`;
  } else if (options.summaryStyle === 'border-left-gradient') {
    css.summaryCSS = `border-left: 3px solid ${accent}; padding-left: 1.25rem; background: linear-gradient(90deg, ${secondary} 0%, transparent 50%); border-radius: 0 8px 8px 0;`;
  }

  // Skill Tag CSS with size option
  const skillSizeMap = { compact: '0.75rem', normal: '0.875rem', large: '1rem' };
  const skillPaddingMap = { compact: '0.25rem 0.625rem', normal: '0.375rem 0.875rem', large: '0.5rem 1rem' };
  const fontSize = skillSizeMap[options.skillTagSize || 'normal'];
  const padding = skillPaddingMap[options.skillTagSize || 'normal'];
  css.skillTagCSS = `padding: ${padding}; border-radius: 6px; font-size: ${fontSize}; font-weight: 500; border: 1px solid ${accent}30; background: ${secondary};`;

  // Section and Divider CSS
  css.sectionCSS = 'margin-bottom: 2rem;';
  css.dividerCSS = `height: 1px; background: linear-gradient(90deg, ${accent}40 0%, transparent 100%); margin: 1.5rem 0;`;

  return css;
}

// =============================================================================
// MAIN GENERATION FUNCTION - 6 STEPS
// =============================================================================

export interface GenerateStyleResult {
  styleConfig: CVStyleConfig;
  usage: TokenUsage;
}

export async function generateCVStyle(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced'
): Promise<GenerateStyleResult> {
  console.log(`[Style Gen] Starting 6-step generation with provider: ${provider}, model: ${model}, creativity: ${creativityLevel}`);
  const startTime = Date.now();

  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);
  const aiModel = aiProvider(modelId);

  const context = buildContextPrompt(linkedInSummary, jobVacancy, userPreferences);

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // =========================================================================
  // STEP 1: Layout (structure only)
  // =========================================================================
  console.log(`[Style Gen] Step 1/6: Generating layout...`);
  const layoutResult = await generateObject({
    model: aiModel,
    schema: getLayoutSchema(creativityLevel),
    prompt: layoutPrompts[creativityLevel](context),
  });
  totalPromptTokens += layoutResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += layoutResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 1 complete: divider=${layoutResult.object.sectionDivider}, spacing=${layoutResult.object.spacing}`);

  // =========================================================================
  // STEP 2: Header (eyecatcher - dedicated header styling)
  // =========================================================================
  console.log(`[Style Gen] Step 2/6: Generating header...`);
  const headerResult = await generateObject({
    model: aiModel,
    schema: getHeaderSchema(creativityLevel),
    prompt: headerPrompts[creativityLevel](context, layoutResult.object),
  });
  totalPromptTokens += headerResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += headerResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 2 complete: headerStyle=${headerResult.object.headerStyle}, accent=${headerResult.object.headerAccent}`);

  // =========================================================================
  // STEP 3: Typography (body content fonts)
  // =========================================================================
  console.log(`[Style Gen] Step 3/6: Generating typography...`);
  const typographyResult = await generateObject({
    model: aiModel,
    schema: getTypographySchema(creativityLevel),
    prompt: typographyPrompts[creativityLevel](context, layoutResult.object, headerResult.object),
  });
  totalPromptTokens += typographyResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += typographyResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 3 complete: heading=${typographyResult.object.headingFont}, body=${typographyResult.object.bodyFont}`);

  // =========================================================================
  // STEP 4: Colors (palette)
  // =========================================================================
  console.log(`[Style Gen] Step 4/6: Generating colors...`);
  const colorsResult = await generateObject({
    model: aiModel,
    schema: getColorsSchema(creativityLevel),
    prompt: colorsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object),
  });
  totalPromptTokens += colorsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += colorsResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 4 complete: style="${colorsResult.object.styleName}", primary=${colorsResult.object.primary}`);

  // =========================================================================
  // STEP 5: Skills (dedicated skill display options)
  // =========================================================================
  console.log(`[Style Gen] Step 5/6: Generating skills display...`);
  const skillsResult = await generateObject({
    model: aiModel,
    schema: getSkillsSchema(creativityLevel),
    prompt: skillsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object, colorsResult.object),
  });
  totalPromptTokens += skillsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += skillsResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 5 complete: display=${skillsResult.object.skillDisplay}, variant=${skillsResult.object.skillTagVariant}`);

  // =========================================================================
  // STEP 6: Details (finishing touches)
  // =========================================================================
  console.log(`[Style Gen] Step 6/6: Generating details...`);
  const detailsResult = await generateObject({
    model: aiModel,
    schema: getDetailsSchema(creativityLevel),
    prompt: detailsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object, colorsResult.object, skillsResult.object),
  });
  totalPromptTokens += detailsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += detailsResult.usage?.outputTokens ?? 0;
  console.log(`[Style Gen] Step 6 complete: itemStyle=${detailsResult.object.itemStyle}, corners=${detailsResult.object.cornerStyle}`);

  // =========================================================================
  // Generate Custom CSS for creative/experimental levels
  // =========================================================================
  let customCSS: Record<string, string | undefined> | undefined;

  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedDetails = detailsResult.object as z.infer<typeof extendedDetailsSchema>;
    const extendedTypography = typographyResult.object as z.infer<typeof extendedTypographySchema>;
    const extendedHeader = headerResult.object as z.infer<typeof extendedHeaderSchema>;
    const creativeSkills = skillsResult.object as z.infer<typeof creativeSkillsSchema>;

    const cssOptions: CSSOptions = {
      summaryStyle: extendedDetails.summaryStyle,
      itemShadow: extendedDetails.itemShadow,
      sectionTitleLetterSpacing: extendedTypography.sectionTitleLetterSpacing,
      headerPadding: extendedHeader.headerPadding,
      nameLetterSpacing: extendedHeader.nameLetterSpacing,
      skillTagSize: creativeSkills.skillTagSize,
      skillCategoryStyle: creativeSkills.skillCategoryStyle,
    };

    if (creativityLevel === 'experimental') {
      const experimentalHeader = headerResult.object as z.infer<typeof experimentalHeaderSchema>;
      cssOptions.headerGradient = experimentalHeader.headerGradient;
      cssOptions.headerShadow = experimentalHeader.headerShadow;
      cssOptions.nameTextShadow = experimentalHeader.nameTextShadow;
    }

    customCSS = generateCustomCSS(cssOptions, {
      primary: colorsResult.object.primary,
      secondary: colorsResult.object.secondary,
      accent: colorsResult.object.accent,
    });
    console.log(`[Style Gen] Custom CSS generated for ${creativityLevel} level`);
  }

  // =========================================================================
  // Combine all results into final CVStyleConfig
  // =========================================================================
  const layoutObj = layoutResult.object;
  const headerObj = headerResult.object;
  const typographyObj = typographyResult.object;
  const colorsObj = colorsResult.object;
  const skillsObj = skillsResult.object;
  const detailsObj = detailsResult.object;

  // Build layout object - combining layout and some header fields for backward compatibility
  const layoutConfig: CVStyleConfig['layout'] = {
    style: 'single-column',
    headerStyle: headerObj.headerStyle,
    sectionOrder: layoutObj.sectionOrder,
    sectionDivider: layoutObj.sectionDivider,
    skillDisplay: skillsObj.skillDisplay,
    spacing: layoutObj.spacing,
    showPhoto: layoutObj.showPhoto,
  };

  // Add extended header fields to layout for backward compatibility
  if (creativityLevel === 'balanced' || creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedHeader = headerObj as z.infer<typeof extendedHeaderSchema>;
    layoutConfig.headerPadding = extendedHeader.headerPadding;
  }

  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const creativeHeader = headerObj as z.infer<typeof creativeHeaderSchema>;
    layoutConfig.headerGradientAngle = creativeHeader.headerGradientAngle;
  }

  // Build decorations object
  const decorationsConfig: CVStyleConfig['decorations'] = {
    intensity: detailsObj.intensity,
    useBorders: detailsObj.useBorders,
    useBackgrounds: detailsObj.useBackgrounds,
    iconStyle: detailsObj.iconStyle,
    cornerStyle: detailsObj.cornerStyle,
    itemStyle: detailsObj.itemStyle,
    headerAccent: headerObj.headerAccent,
    skillTagVariant: skillsObj.skillTagVariant,
    svgDecorations: {
      enabled: false,
      theme: 'none',
      placement: 'corners',
      opacity: 0.1,
      scale: 'small',
      colorSource: 'accent',
    },
  };

  // Add extended details fields
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedDetails = detailsObj as z.infer<typeof extendedDetailsSchema>;
    if (extendedDetails.itemBorderWidth) {
      decorationsConfig.itemBorderWidth = extendedDetails.itemBorderWidth;
    }
  }

  const styleConfig: CVStyleConfig = {
    styleName: colorsObj.styleName,
    styleRationale: colorsObj.styleRationale,
    industryFit: colorsObj.industryFit,
    formalityLevel: colorsObj.formalityLevel,
    colors: {
      primary: colorsObj.primary,
      secondary: colorsObj.secondary,
      accent: colorsObj.accent,
      text: colorsObj.text,
      muted: colorsObj.muted,
    },
    typography: {
      headingFont: typographyObj.headingFont,
      bodyFont: typographyObj.bodyFont,
      nameSizePt: headerObj.nameSizePt,
      headingSizePt: typographyObj.headingSizePt,
      bodySizePt: typographyObj.bodySizePt,
      lineHeight: typographyObj.lineHeight,
    },
    layout: layoutConfig,
    decorations: decorationsConfig,
    customCSS: customCSS,
  };

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Style Gen] All 6 steps complete! Total time: ${duration}s`);

  return {
    styleConfig,
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}

// =============================================================================
// Helper function to create a summary of LinkedIn data
// =============================================================================
export function createLinkedInSummary(linkedIn: {
  fullName: string;
  headline?: string | null;
  location?: string | null;
  about?: string | null;
  experience: Array<{ title: string; company: string }>;
  skills: Array<{ name: string }>;
}): string {
  const parts: string[] = [];

  parts.push(`Name: ${linkedIn.fullName}`);

  if (linkedIn.headline) {
    parts.push(`Current Role: ${linkedIn.headline}`);
  }

  if (linkedIn.location) {
    parts.push(`Location: ${linkedIn.location}`);
  }

  if (linkedIn.experience.length > 0) {
    const recentRoles = linkedIn.experience.slice(0, 3)
      .map(exp => `${exp.title} at ${exp.company}`)
      .join(', ');
    parts.push(`Recent Experience: ${recentRoles}`);
  }

  if (linkedIn.skills.length > 0) {
    const topSkills = linkedIn.skills.slice(0, 5)
      .map(s => s.name)
      .join(', ');
    parts.push(`Key Skills: ${topSkills}`);
  }

  if (linkedIn.about) {
    const aboutShort = linkedIn.about.length > 200
      ? linkedIn.about.substring(0, 200) + '...'
      : linkedIn.about;
    parts.push(`About: ${aboutShort}`);
  }

  return parts.join('\n');
}

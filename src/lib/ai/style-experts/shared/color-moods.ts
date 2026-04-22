/**
 * Color moods used by the variation nudge across style experts.
 * Moved verbatim from the old style-generator-v2.ts.
 */

export interface ColorMood {
  mood: string;
  description: string;
}

export const colorMoods: ColorMood[] = [
  { mood: 'warm-earthy', description: 'Warm earth tones: terracotta, sienna, amber, olive. Think autumn, organic, grounded.' },
  { mood: 'cool-ocean', description: 'Cool ocean tones: teal, navy, seafoam, coral accent. Think depth, trust, calm.' },
  { mood: 'bold-contrast', description: 'High contrast bold: deep saturated primary with vibrant complementary accent. Think energy, confidence.' },
  { mood: 'luxe-dark', description: 'Dark luxury: deep jewel tones (midnight, plum, emerald) with metallic or warm accents. Think premium, exclusive.' },
  { mood: 'fresh-modern', description: 'Fresh modern: bright greens, teals, or electric blues with warm accent. Think startup, innovation.' },
  { mood: 'sunset-warm', description: 'Sunset warmth: coral, rose, burnt orange with cool contrast. Think creative, approachable.' },
  { mood: 'forest-natural', description: 'Forest tones: deep greens, moss, sage with warm wood accents. Think sustainable, natural, reliable.' },
  { mood: 'industrial-slate', description: 'Industrial: charcoal, slate, steel with a single bright accent. Think structured, engineering, precision.' },
  { mood: 'berry-rich', description: 'Rich berry: burgundy, plum, magenta with teal or gold contrast. Think sophisticated, distinctive.' },
  { mood: 'nordic-minimal', description: 'Nordic clean: muted blue-grays with one strong accent. Think Scandinavian, efficient, elegant.' },
];

/**
 * Decorative Background Elements for CV
 *
 * Subtle SVG shapes that add visual interest without distracting from content.
 * Used primarily in creative/experimental style modes.
 */

import type { DecorationIntensity, DecorationTheme, CustomDecoration } from '@/types/design-tokens';

// Available decoration shapes
export const decorationShapes = {
  circle: (size: number, color: string, opacity: number) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}" fill-opacity="${opacity}" />
  `,

  ring: (size: number, color: string, opacity: number) => `
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" />
  `,

  square: (size: number, color: string, opacity: number) => `
    <rect width="${size}" height="${size}" fill="${color}" fill-opacity="${opacity}" />
  `,

  diamond: (size: number, color: string, opacity: number) => `
    <polygon points="${size / 2},0 ${size},${size / 2} ${size / 2},${size} 0,${size / 2}" fill="${color}" fill-opacity="${opacity}" />
  `,

  triangle: (size: number, color: string, opacity: number) => `
    <polygon points="${size / 2},0 ${size},${size} 0,${size}" fill="${color}" fill-opacity="${opacity}" />
  `,

  hexagon: (size: number, color: string, opacity: number) => {
    const h = size / 2;
    const w = size * 0.866; // sqrt(3)/2
    return `
      <polygon points="${w},0 ${w * 2},${h / 2} ${w * 2},${h * 1.5} ${w},${size} 0,${h * 1.5} 0,${h / 2}"
               fill="${color}" fill-opacity="${opacity}" transform="translate(${(size - w * 2) / 2}, 0)" />
    `;
  },

  cross: (size: number, color: string, opacity: number) => `
    <path d="M${size * 0.35},0 H${size * 0.65} V${size * 0.35} H${size} V${size * 0.65} H${size * 0.65} V${size} H${size * 0.35} V${size * 0.65} H0 V${size * 0.35} H${size * 0.35} Z"
          fill="${color}" fill-opacity="${opacity}" />
  `,

  star: (size: number, color: string, opacity: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2;
    const innerR = size / 4;
    const points: string[] = [];
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 72 - 90) * (Math.PI / 180);
      const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
      points.push(`${cx + outerR * Math.cos(outerAngle)},${cy + outerR * Math.sin(outerAngle)}`);
      points.push(`${cx + innerR * Math.cos(innerAngle)},${cy + innerR * Math.sin(innerAngle)}`);
    }
    return `<polygon points="${points.join(' ')}" fill="${color}" fill-opacity="${opacity}" />`;
  },

  dots: (size: number, color: string, opacity: number) => `
    <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.1}" fill="${color}" fill-opacity="${opacity}" />
    <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.1}" fill="${color}" fill-opacity="${opacity}" />
    <circle cx="${size * 0.25}" cy="${size * 0.75}" r="${size * 0.1}" fill="${color}" fill-opacity="${opacity}" />
    <circle cx="${size * 0.75}" cy="${size * 0.75}" r="${size * 0.1}" fill="${color}" fill-opacity="${opacity}" />
  `,

  wave: (size: number, color: string, opacity: number) => `
    <path d="M0,${size / 2} Q${size / 4},${size / 4} ${size / 2},${size / 2} T${size},${size / 2}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" />
  `,

  arc: (size: number, color: string, opacity: number) => `
    <path d="M0,${size} A${size},${size} 0 0,1 ${size},0"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" />
  `,
};

export type DecorationShape = keyof typeof decorationShapes;

// Theme-specific shape mappings - each theme uses a curated selection of shapes
export const themeShapes: Record<DecorationTheme, DecorationShape[]> = {
  geometric: ['hexagon', 'triangle', 'square', 'diamond', 'dots'],
  organic: ['circle', 'wave', 'arc', 'ring'],
  minimal: ['ring', 'arc', 'dots'],
  tech: ['square', 'hexagon', 'dots', 'cross'],
  creative: ['star', 'diamond', 'circle', 'triangle', 'wave'],
  abstract: ['circle', 'ring', 'square', 'diamond', 'triangle', 'hexagon', 'dots', 'wave', 'arc'],
};

// Custom decoration generators - converts LLM descriptions to SVG shapes
export const customDecorationGenerators: Record<string, (size: number, color: string, opacity: number) => string> = {
  // Software/Tech
  'code-bracket': (size, color, opacity) => `
    <path d="M${size * 0.3},${size * 0.2} L${size * 0.15},${size * 0.5} L${size * 0.3},${size * 0.8}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" stroke-linecap="round"/>
    <path d="M${size * 0.7},${size * 0.2} L${size * 0.85},${size * 0.5} L${size * 0.7},${size * 0.8}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" stroke-linecap="round"/>
  `,
  'terminal-cursor': (size, color, opacity) => `
    <rect x="${size * 0.3}" y="${size * 0.3}" width="${size * 0.4}" height="${size * 0.4}"
          fill="${color}" fill-opacity="${opacity * 0.8}"/>
  `,
  'git-branch': (size, color, opacity) => `
    <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.5}" cy="${size * 0.7}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity}"/>
    <path d="M${size * 0.3},${size * 0.38} L${size * 0.3},${size * 0.5} Q${size * 0.3},${size * 0.7} ${size * 0.42},${size * 0.7}"
          fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity}"/>
    <path d="M${size * 0.7},${size * 0.38} L${size * 0.7},${size * 0.5} Q${size * 0.7},${size * 0.7} ${size * 0.58},${size * 0.7}"
          fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity}"/>
  `,
  // Data Science
  'scatter-dots': (size, color, opacity) => `
    <circle cx="${size * 0.2}" cy="${size * 0.6}" r="${size * 0.06}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.35}" cy="${size * 0.4}" r="${size * 0.05}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.5}" cy="${size * 0.55}" r="${size * 0.07}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.65}" cy="${size * 0.35}" r="${size * 0.04}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.8}" cy="${size * 0.25}" r="${size * 0.06}" fill="${color}" fill-opacity="${opacity}"/>
  `,
  'neural-node': (size, color, opacity) => `
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.15}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>
    <line x1="${size * 0.5}" y1="${size * 0.35}" x2="${size * 0.5}" y2="${size * 0.1}" stroke="${color}" stroke-width="1" stroke-opacity="${opacity * 0.6}"/>
    <line x1="${size * 0.35}" y1="${size * 0.5}" x2="${size * 0.1}" y2="${size * 0.5}" stroke="${color}" stroke-width="1" stroke-opacity="${opacity * 0.6}"/>
    <line x1="${size * 0.65}" y1="${size * 0.5}" x2="${size * 0.9}" y2="${size * 0.5}" stroke="${color}" stroke-width="1" stroke-opacity="${opacity * 0.6}"/>
    <line x1="${size * 0.5}" y1="${size * 0.65}" x2="${size * 0.5}" y2="${size * 0.9}" stroke="${color}" stroke-width="1" stroke-opacity="${opacity * 0.6}"/>
  `,
  'data-flow': (size, color, opacity) => `
    <path d="M${size * 0.1},${size * 0.5} Q${size * 0.3},${size * 0.3} ${size * 0.5},${size * 0.5} Q${size * 0.7},${size * 0.7} ${size * 0.9},${size * 0.5}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>
    <circle cx="${size * 0.1}" cy="${size * 0.5}" r="${size * 0.04}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.9}" cy="${size * 0.5}" r="${size * 0.04}" fill="${color}" fill-opacity="${opacity}"/>
  `,
  // Marketing
  'trend-arrow': (size, color, opacity) => `
    <path d="M${size * 0.1},${size * 0.8} Q${size * 0.4},${size * 0.6} ${size * 0.6},${size * 0.4} L${size * 0.9},${size * 0.15}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>
    <polygon points="${size * 0.85},${size * 0.1} ${size * 0.95},${size * 0.2} ${size * 0.82},${size * 0.22}"
             fill="${color}" fill-opacity="${opacity}"/>
  `,
  'speech-bubble': (size, color, opacity) => `
    <path d="M${size * 0.2},${size * 0.3} Q${size * 0.2},${size * 0.15} ${size * 0.4},${size * 0.15}
             L${size * 0.6},${size * 0.15} Q${size * 0.8},${size * 0.15} ${size * 0.8},${size * 0.3}
             L${size * 0.8},${size * 0.5} Q${size * 0.8},${size * 0.65} ${size * 0.6},${size * 0.65}
             L${size * 0.4},${size * 0.65} L${size * 0.25},${size * 0.85} L${size * 0.35},${size * 0.65}
             Q${size * 0.2},${size * 0.65} ${size * 0.2},${size * 0.5} Z"
          fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity}"/>
  `,
  'target-ring': (size, color, opacity) => `
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.4}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.5}"/>
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.25}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.7}"/>
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.1}" fill="${color}" fill-opacity="${opacity}"/>
  `,
  // Finance
  'growth-chart': (size, color, opacity) => `
    <rect x="${size * 0.15}" y="${size * 0.6}" width="${size * 0.12}" height="${size * 0.25}" fill="${color}" fill-opacity="${opacity * 0.6}"/>
    <rect x="${size * 0.35}" y="${size * 0.45}" width="${size * 0.12}" height="${size * 0.4}" fill="${color}" fill-opacity="${opacity * 0.8}"/>
    <rect x="${size * 0.55}" y="${size * 0.3}" width="${size * 0.12}" height="${size * 0.55}" fill="${color}" fill-opacity="${opacity}"/>
    <rect x="${size * 0.75}" y="${size * 0.15}" width="${size * 0.12}" height="${size * 0.7}" fill="${color}" fill-opacity="${opacity}"/>
  `,
  'pie-segment': (size, color, opacity) => `
    <path d="M${size * 0.5},${size * 0.5} L${size * 0.5},${size * 0.1} A${size * 0.4},${size * 0.4} 0 0,1 ${size * 0.85},${size * 0.65} Z"
          fill="${color}" fill-opacity="${opacity}"/>
  `,
  'currency-wave': (size, color, opacity) => `
    <path d="M${size * 0.1},${size * 0.5} Q${size * 0.25},${size * 0.3} ${size * 0.4},${size * 0.5} Q${size * 0.55},${size * 0.7} ${size * 0.7},${size * 0.5} Q${size * 0.85},${size * 0.3} ${size * 0.95},${size * 0.5}"
          fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>
  `,
  // Healthcare
  'pulse-line': (size, color, opacity) => `
    <polyline points="${size * 0.05},${size * 0.5} ${size * 0.25},${size * 0.5} ${size * 0.35},${size * 0.2} ${size * 0.45},${size * 0.8} ${size * 0.55},${size * 0.3} ${size * 0.65},${size * 0.6} ${size * 0.75},${size * 0.5} ${size * 0.95},${size * 0.5}"
              fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'molecule': (size, color, opacity) => `
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.12}" fill="${color}" fill-opacity="${opacity}"/>
    <circle cx="${size * 0.25}" cy="${size * 0.35}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity * 0.7}"/>
    <circle cx="${size * 0.75}" cy="${size * 0.35}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity * 0.7}"/>
    <circle cx="${size * 0.35}" cy="${size * 0.75}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity * 0.7}"/>
    <circle cx="${size * 0.65}" cy="${size * 0.75}" r="${size * 0.08}" fill="${color}" fill-opacity="${opacity * 0.7}"/>
    <line x1="${size * 0.38}" y1="${size * 0.42}" x2="${size * 0.3}" y2="${size * 0.4}" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.5}"/>
    <line x1="${size * 0.62}" y1="${size * 0.42}" x2="${size * 0.7}" y2="${size * 0.4}" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.5}"/>
    <line x1="${size * 0.42}" y1="${size * 0.6}" x2="${size * 0.38}" y2="${size * 0.7}" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.5}"/>
    <line x1="${size * 0.58}" y1="${size * 0.6}" x2="${size * 0.62}" y2="${size * 0.7}" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity * 0.5}"/>
  `,
  'care-plus': (size, color, opacity) => `
    <rect x="${size * 0.4}" y="${size * 0.2}" width="${size * 0.2}" height="${size * 0.6}" rx="${size * 0.03}" fill="${color}" fill-opacity="${opacity}"/>
    <rect x="${size * 0.2}" y="${size * 0.4}" width="${size * 0.6}" height="${size * 0.2}" rx="${size * 0.03}" fill="${color}" fill-opacity="${opacity}"/>
  `,
  // Design
  'grid-dots': (size, color, opacity) => `
    ${[0.2, 0.4, 0.6, 0.8].map(x =>
      [0.2, 0.4, 0.6, 0.8].map(y =>
        `<circle cx="${size * x}" cy="${size * y}" r="${size * 0.03}" fill="${color}" fill-opacity="${opacity}"/>`
      ).join('')
    ).join('')}
  `,
  'shape-morph': (size, color, opacity) => `
    <path d="M${size * 0.3},${size * 0.2} Q${size * 0.7},${size * 0.1} ${size * 0.8},${size * 0.4}
             Q${size * 0.9},${size * 0.7} ${size * 0.5},${size * 0.85}
             Q${size * 0.2},${size * 0.75} ${size * 0.15},${size * 0.5}
             Q${size * 0.1},${size * 0.3} ${size * 0.3},${size * 0.2} Z"
          fill="${color}" fill-opacity="${opacity}"/>
  `,
  'palette-swatches': (size, color, opacity) => `
    <rect x="${size * 0.15}" y="${size * 0.25}" width="${size * 0.3}" height="${size * 0.5}" rx="${size * 0.02}" fill="${color}" fill-opacity="${opacity * 0.5}"/>
    <rect x="${size * 0.35}" y="${size * 0.2}" width="${size * 0.3}" height="${size * 0.5}" rx="${size * 0.02}" fill="${color}" fill-opacity="${opacity * 0.7}"/>
    <rect x="${size * 0.55}" y="${size * 0.3}" width="${size * 0.3}" height="${size * 0.5}" rx="${size * 0.02}" fill="${color}" fill-opacity="${opacity}"/>
  `,
};

// Decoration configuration
export interface DecorationConfig {
  shape: DecorationShape;
  size: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  rotation: number; // degrees
  color: string;
  opacity: number;
}

// Seeded random number generator for consistent results
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Generate random decorations based on style parameters
export function generateDecorations(
  primaryColor: string,
  accentColor: string,
  intensity: DecorationIntensity = 'moderate',
  seed: number = Date.now(),
  theme?: DecorationTheme,
  customDecorations?: CustomDecoration[]
): DecorationConfig[] {
  // Return empty for 'none'
  if (intensity === 'none') {
    return [];
  }

  const random = seededRandom(seed);

  // Number of decorations based on intensity
  const countMap: Record<Exclude<DecorationIntensity, 'none'>, { min: number; max: number }> = {
    minimal: { min: 3, max: 6 },
    moderate: { min: 5, max: 10 },
    abundant: { min: 8, max: 15 },
  };
  const { min, max } = countMap[intensity];
  const count = Math.floor(random() * (max - min + 1)) + min;

  // Use theme-specific shapes if a theme is provided, otherwise use all shapes
  const shapes: DecorationShape[] = theme
    ? themeShapes[theme]
    : ['circle', 'ring', 'square', 'diamond', 'triangle', 'hexagon', 'dots', 'arc', 'wave', 'cross', 'star'];

  // Colors to use (mix primary, accent, and variations)
  const colors = [primaryColor, accentColor, primaryColor, accentColor];

  // Generate decorations with more varied positioning
  const decorations: DecorationConfig[] = [];

  // Define zones for more even distribution
  const zones = [
    // Corners — safe from content
    { xMin: 0, xMax: 15, yMin: 0, yMax: 12 },      // Top-left
    { xMin: 85, xMax: 100, yMin: 0, yMax: 12 },    // Top-right
    { xMin: 0, xMax: 15, yMin: 88, yMax: 100 },    // Bottom-left
    { xMin: 85, xMax: 100, yMin: 88, yMax: 100 },  // Bottom-right
    // Edges — narrow strips along margins
    { xMin: 20, xMax: 80, yMin: 0, yMax: 6 },      // Top edge
    { xMin: 20, xMax: 80, yMin: 94, yMax: 100 },   // Bottom edge
    { xMin: 0, xMax: 8, yMin: 15, yMax: 85 },      // Left edge
    { xMin: 92, xMax: 100, yMin: 15, yMax: 85 },   // Right edge
  ];

  for (let i = 0; i < count; i++) {
    // Random shape - shuffle selection for more variety
    const shapeIndex = Math.floor(random() * shapes.length);
    const shape = shapes[shapeIndex];

    // More varied size range
    const sizeVariation = random();
    let size: number;
    if (intensity === 'abundant') {
      size = 12 + Math.floor(sizeVariation * 25); // 12-37px
    } else if (intensity === 'moderate') {
      size = 15 + Math.floor(sizeVariation * 30); // 15-45px
    } else {
      size = 20 + Math.floor(sizeVariation * 30); // 20-50px
    }

    // Pick a random zone for positioning
    const zoneIndex = Math.floor(random() * zones.length);
    const zone = zones[zoneIndex];

    // Random position within the zone with additional jitter
    let x = zone.xMin + random() * (zone.xMax - zone.xMin);
    let y = zone.yMin + random() * (zone.yMax - zone.yMin);

    // Add some random offset for more organic placement
    const jitterX = (random() - 0.5) * 10;
    const jitterY = (random() - 0.5) * 10;
    x = Math.max(0, Math.min(100, x + jitterX));
    y = Math.max(0, Math.min(100, y + jitterY));

    // More varied rotation
    const rotation = Math.floor(random() * 360);

    // Random color with bias towards primary
    const colorIndex = Math.floor(random() * colors.length);
    const color = colors[colorIndex];

    // Varied opacity — lower for abundant to reduce visual noise
    const opacity = intensity === 'abundant'
      ? 0.05 + random() * 0.07  // 5-12%
      : 0.08 + random() * 0.10; // 8-18%

    decorations.push({
      shape,
      size,
      x,
      y,
      rotation,
      color,
      opacity,
    });
  }

  // Shuffle the decorations array for more randomness in render order
  for (let i = decorations.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [decorations[i], decorations[j]] = [decorations[j], decorations[i]];
  }

  return decorations;
}

// Generate SVG for a single decoration
export function decorationToSVG(config: DecorationConfig): string {
  const { shape, size, x, y, rotation, color, opacity } = config;
  const shapeGenerator = decorationShapes[shape];
  const shapeContent = shapeGenerator(size, color, opacity);

  return `
    <svg class="cv-decoration"
         style="position: absolute; left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%) rotate(${rotation}deg); pointer-events: none; z-index: 0;"
         viewBox="0 0 ${size} ${size}"
         xmlns="http://www.w3.org/2000/svg">
      ${shapeContent}
    </svg>
  `;
}

// Generate SVG for a custom decoration
export function customDecorationToSVG(
  decoration: CustomDecoration,
  primaryColor: string,
  accentColor: string,
  x: number,
  y: number,
  rotation: number
): string {
  // Map size to pixel values
  const sizeMap = { small: 30, medium: 50, large: 55 };
  const size = sizeMap[decoration.size];

  // Try to find a matching custom generator, fallback to basic shape
  const normalizedName = decoration.name.toLowerCase().replace(/[^a-z-]/g, '');
  const generator = customDecorationGenerators[normalizedName];

  // Use accent color for variety
  const color = Math.random() > 0.5 ? primaryColor : accentColor;
  const opacity = 0.12 + Math.random() * 0.08; // 12-20% opacity

  let shapeContent: string;
  if (generator) {
    shapeContent = generator(size, color, opacity);
  } else {
    // Fallback: generate a simple circle if no matching generator
    shapeContent = `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="${color}" fill-opacity="${opacity}"/>`;
  }

  return `
    <svg class="cv-decoration cv-custom-decoration"
         style="position: absolute; left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%) rotate(${rotation}deg); pointer-events: none; z-index: 0;"
         viewBox="0 0 ${size} ${size}"
         xmlns="http://www.w3.org/2000/svg">
      ${shapeContent}
    </svg>
  `;
}

// Generate custom decorations based on placement
function generateCustomDecorationsHTML(
  customDecorations: CustomDecoration[],
  primaryColor: string,
  accentColor: string,
  seed: number = Date.now()
): string {
  const random = seededRandom(seed);
  const results: string[] = [];

  // Placement zones for each type
  const placementZones = {
    corner: [
      { xMin: 0, xMax: 20, yMin: 0, yMax: 15 },    // Top-left
      { xMin: 80, xMax: 100, yMin: 0, yMax: 15 },  // Top-right
      { xMin: 0, xMax: 20, yMin: 85, yMax: 100 },  // Bottom-left
      { xMin: 80, xMax: 100, yMin: 85, yMax: 100 },// Bottom-right
    ],
    edge: [
      { xMin: 20, xMax: 80, yMin: 0, yMax: 10 },   // Top edge
      { xMin: 20, xMax: 80, yMin: 90, yMax: 100 }, // Bottom edge
      { xMin: 0, xMax: 12, yMin: 15, yMax: 85 },   // Left edge
      { xMin: 88, xMax: 100, yMin: 15, yMax: 85 }, // Right edge
    ],
    scattered: [
      { xMin: 0, xMax: 25, yMin: 25, yMax: 75 },   // Left side
      { xMin: 75, xMax: 100, yMin: 25, yMax: 75 }, // Right side
      { xMin: 25, xMax: 75, yMin: 0, yMax: 20 },   // Top area
      { xMin: 25, xMax: 75, yMin: 80, yMax: 100 }, // Bottom area
    ],
  };

  let totalPlaced = 0;
  const maxCustomInstances = 12;

  for (const decoration of customDecorations) {
    if (totalPlaced >= maxCustomInstances) break;
    const zones = placementZones[decoration.placement];

    for (let i = 0; i < decoration.quantity && totalPlaced < maxCustomInstances; i++) {
      // Pick a random zone
      const zone = zones[Math.floor(random() * zones.length)];

      // Random position within zone
      const x = zone.xMin + random() * (zone.xMax - zone.xMin);
      const y = zone.yMin + random() * (zone.yMax - zone.yMin);
      const rotation = Math.floor(random() * 360);

      results.push(customDecorationToSVG(decoration, primaryColor, accentColor, x, y, rotation));
      totalPlaced++;
    }
  }

  return results.join('\n');
}

// Generate all decorations HTML
export function generateDecorationsHTML(
  primaryColor: string,
  accentColor: string,
  intensity: DecorationIntensity = 'moderate',
  seed?: number,
  theme?: DecorationTheme,
  customDecorations?: CustomDecoration[]
): string {
  if (intensity === 'none') {
    return '';
  }

  const decorationSeed = seed ?? Date.now();
  let decorationsContent = '';

  // Generate standard theme-based decorations
  const decorations = generateDecorations(primaryColor, accentColor, intensity, decorationSeed, theme);
  if (decorations.length > 0) {
    decorationsContent += decorations.map(d => decorationToSVG(d)).join('\n');
  }

  // Add custom decorations for experimental mode
  if (customDecorations && customDecorations.length > 0) {
    decorationsContent += generateCustomDecorationsHTML(customDecorations, primaryColor, accentColor, decorationSeed + 1000);
  }

  if (!decorationsContent) {
    return '';
  }

  return `
    <div class="cv-decorations" aria-hidden="true">
      ${decorationsContent}
    </div>
  `;
}

// CSS for decorations container
export const decorationsCSS = `
  .cv-decorations {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .cv-decoration {
    position: absolute;
    pointer-events: none;
  }

  /* Ensure container is positioned for absolute children */
  .cv-container {
    position: relative;
    z-index: 0;
  }

  /* Content stays above decorations */
  .cv-header,
  .section {
    position: relative;
    z-index: 1;
    background: transparent;
  }

  /* Print optimization - keep decorations but ensure they print */
  @media print {
    .cv-decorations {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .cv-decoration {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

/**
 * Decorative Background Elements for CV
 *
 * Subtle SVG shapes that add visual interest without distracting from content.
 * Used primarily in creative/experimental style modes.
 */

import type { DecorationIntensity } from '@/types/design-tokens';

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
  seed: number = Date.now()
): DecorationConfig[] {
  // Return empty for 'none'
  if (intensity === 'none') {
    return [];
  }

  const random = seededRandom(seed);

  // Number of decorations based on intensity
  const countMap: Record<Exclude<DecorationIntensity, 'none'>, { min: number; max: number }> = {
    minimal: { min: 4, max: 8 },
    moderate: { min: 8, max: 15 },
    abundant: { min: 15, max: 25 },
  };
  const { min, max } = countMap[intensity];
  const count = Math.floor(random() * (max - min + 1)) + min;

  // Available shapes with more variety
  const shapes: DecorationShape[] = [
    'circle', 'ring', 'square', 'diamond', 'triangle',
    'hexagon', 'dots', 'arc', 'wave', 'cross', 'star',
  ];

  // Colors to use (mix primary, accent, and variations)
  const colors = [primaryColor, accentColor, primaryColor, accentColor];

  // Generate decorations with more varied positioning
  const decorations: DecorationConfig[] = [];

  // Define zones for more even distribution
  const zones = [
    // Corners
    { xMin: 0, xMax: 20, yMin: 0, yMax: 15 },      // Top-left
    { xMin: 80, xMax: 100, yMin: 0, yMax: 15 },    // Top-right
    { xMin: 0, xMax: 20, yMin: 85, yMax: 100 },    // Bottom-left
    { xMin: 80, xMax: 100, yMin: 85, yMax: 100 },  // Bottom-right
    // Edges
    { xMin: 20, xMax: 80, yMin: 0, yMax: 10 },     // Top edge
    { xMin: 20, xMax: 80, yMin: 90, yMax: 100 },   // Bottom edge
    { xMin: 0, xMax: 12, yMin: 15, yMax: 85 },     // Left edge
    { xMin: 88, xMax: 100, yMin: 15, yMax: 85 },   // Right edge
    // Scattered (away from center content)
    { xMin: 0, xMax: 25, yMin: 25, yMax: 75 },     // Left side scattered
    { xMin: 75, xMax: 100, yMin: 25, yMax: 75 },   // Right side scattered
    { xMin: 25, xMax: 75, yMin: 0, yMax: 20 },     // Top area scattered
    { xMin: 25, xMax: 75, yMin: 80, yMax: 100 },   // Bottom area scattered
  ];

  for (let i = 0; i < count; i++) {
    // Random shape - shuffle selection for more variety
    const shapeIndex = Math.floor(random() * shapes.length);
    const shape = shapes[shapeIndex];

    // More varied size range
    const sizeVariation = random();
    let size: number;
    if (intensity === 'abundant') {
      size = 15 + Math.floor(sizeVariation * 35); // 15-50px
    } else if (intensity === 'moderate') {
      size = 20 + Math.floor(sizeVariation * 45); // 20-65px
    } else {
      size = 30 + Math.floor(sizeVariation * 50); // 30-80px
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

    // Varied opacity (8-20% range)
    const opacity = 0.08 + random() * 0.12;

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

// Generate all decorations HTML
export function generateDecorationsHTML(
  primaryColor: string,
  accentColor: string,
  intensity: DecorationIntensity = 'moderate',
  seed?: number
): string {
  if (intensity === 'none') {
    return '';
  }
  const decorations = generateDecorations(primaryColor, accentColor, intensity, seed);
  if (decorations.length === 0) {
    return '';
  }
  return `
    <div class="cv-decorations" aria-hidden="true">
      ${decorations.map(d => decorationToSVG(d)).join('\n')}
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
    overflow: visible;
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

import type {
  SVGDecorationConfig,
  SVGDecorationResult,
  CVStyleColors,
} from '@/types';

// Scale multipliers for decoration sizes
const scaleMultipliers = {
  small: 0.7,
  medium: 1.0,
  large: 1.3,
};

// Get color based on colorSource setting
function getColor(
  colorSource: SVGDecorationConfig['colorSource'],
  colors: CVStyleColors,
  index: number = 0
): string {
  switch (colorSource) {
    case 'primary':
      return colors.primary;
    case 'accent':
      return colors.accent;
    case 'secondary':
      return colors.primary; // Use primary on secondary background
    case 'mixed':
      // Alternate between primary and accent
      return index % 2 === 0 ? colors.primary : colors.accent;
    default:
      return colors.primary;
  }
}

// Generate geometric decorations (circles, lines, triangles, dots)
function generateGeometricDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const color2 = getColor(config.colorSource, colors, 1);
  const baseSize = 120 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <circle cx="0" cy="0" r="60" fill="${color1}" fill-opacity="0.3"/>
      <circle cx="30" cy="30" r="8" fill="${color2}" fill-opacity="0.5"/>
      <circle cx="50" cy="15" r="4" fill="${color1}" fill-opacity="0.4"/>
      <line x1="0" y1="80" x2="80" y2="0" stroke="${color2}" stroke-width="2" stroke-opacity="0.2"/>
      <polygon points="70,10 90,50 50,50" fill="${color1}" fill-opacity="0.15"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <circle cx="120" cy="120" r="60" fill="${color1}" fill-opacity="0.3"/>
      <circle cx="90" cy="90" r="8" fill="${color2}" fill-opacity="0.5"/>
      <circle cx="70" cy="105" r="4" fill="${color1}" fill-opacity="0.4"/>
      <line x1="40" y1="120" x2="120" y2="40" stroke="${color2}" stroke-width="2" stroke-opacity="0.2"/>
      <rect x="55" y="55" width="25" height="25" fill="${color1}" fill-opacity="0.15" transform="rotate(45 67.5 67.5)"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${200 * scale}" height="${60 * scale}" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <circle cx="10" cy="30" r="6" fill="${color1}" fill-opacity="0.4"/>
        <circle cx="30" cy="20" r="4" fill="${color2}" fill-opacity="0.3"/>
        <circle cx="50" cy="40" r="5" fill="${color1}" fill-opacity="0.3"/>
        <line x1="70" y1="10" x2="130" y2="50" stroke="${color2}" stroke-width="1.5" stroke-opacity="0.2"/>
        <circle cx="150" cy="25" r="8" fill="${color1}" fill-opacity="0.25"/>
        <circle cx="180" cy="35" r="5" fill="${color2}" fill-opacity="0.35"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  // Background pattern
  const background = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity * 0.5}">
      <defs>
        <pattern id="geo-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="2" fill="${color1}" fill-opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-dots)"/>
    </svg>
  `;
  return { background };
}

// Generate organic decorations (leaves, waves, curves)
function generateOrganicDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const color2 = getColor(config.colorSource, colors, 1);
  const baseSize = 140 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M0,0 Q70,20 40,80 Q10,140 0,140 Z" fill="${color1}" fill-opacity="0.15"/>
      <path d="M20,0 C40,30 30,60 50,80 S70,100 60,120" stroke="${color2}" stroke-width="2" fill="none" stroke-opacity="0.25"/>
      <ellipse cx="25" cy="35" rx="12" ry="20" fill="${color1}" fill-opacity="0.2" transform="rotate(-30 25 35)"/>
      <circle cx="45" cy="50" r="5" fill="${color2}" fill-opacity="0.3"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M140,140 Q70,120 100,60 Q130,0 140,0 Z" fill="${color1}" fill-opacity="0.15"/>
      <path d="M120,140 C100,110 110,80 90,60 S70,40 80,20" stroke="${color2}" stroke-width="2" fill="none" stroke-opacity="0.25"/>
      <ellipse cx="115" cy="105" rx="12" ry="20" fill="${color1}" fill-opacity="0.2" transform="rotate(30 115 105)"/>
      <circle cx="95" cy="90" r="5" fill="${color2}" fill-opacity="0.3"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${180 * scale}" height="${50 * scale}" viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <path d="M0,40 Q30,10 60,30 T120,20 T180,35" stroke="${color1}" stroke-width="2" fill="none" stroke-opacity="0.3"/>
        <path d="M0,45 Q45,25 90,40 T180,30" stroke="${color2}" stroke-width="1.5" fill="none" stroke-opacity="0.2"/>
        <ellipse cx="150" cy="20" rx="8" ry="12" fill="${color1}" fill-opacity="0.2" transform="rotate(20 150 20)"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  const background = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity * 0.4}">
      <defs>
        <pattern id="organic-wave" x="0" y="0" width="100" height="50" patternUnits="userSpaceOnUse">
          <path d="M0,25 Q25,10 50,25 T100,25" stroke="${color1}" stroke-width="1" fill="none" stroke-opacity="0.1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#organic-wave)"/>
    </svg>
  `;
  return { background };
}

// Generate abstract decorations (blobs, confetti, splashes)
function generateAbstractDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const color2 = getColor(config.colorSource, colors, 1);
  const baseSize = 150 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M30,30 Q60,10 80,40 Q100,70 70,90 Q40,110 20,80 Q0,50 30,30 Z" fill="${color1}" fill-opacity="0.2"/>
      <rect x="60" y="20" width="8" height="8" fill="${color2}" fill-opacity="0.4" transform="rotate(45 64 24)"/>
      <rect x="35" y="55" width="6" height="6" fill="${color1}" fill-opacity="0.5" transform="rotate(30 38 58)"/>
      <circle cx="80" cy="60" r="4" fill="${color2}" fill-opacity="0.4"/>
      <circle cx="50" y="80" r="3" fill="${color1}" fill-opacity="0.3"/>
      <path d="M95,30 L100,15 L105,30 L120,35 L105,40 L100,55 L95,40 L80,35 Z" fill="${color2}" fill-opacity="0.15"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M120,120 Q90,140 70,110 Q50,80 80,60 Q110,40 130,70 Q150,100 120,120 Z" fill="${color1}" fill-opacity="0.2"/>
      <rect x="82" y="122" width="8" height="8" fill="${color2}" fill-opacity="0.4" transform="rotate(45 86 126)"/>
      <rect x="107" y="87" width="6" height="6" fill="${color1}" fill-opacity="0.5" transform="rotate(30 110 90)"/>
      <circle cx="70" cy="90" r="4" fill="${color2}" fill-opacity="0.4"/>
      <circle cx="100" cy="70" r="3" fill="${color1}" fill-opacity="0.3"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${200 * scale}" height="${60 * scale}" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <path d="M160,30 Q175,15 185,35 Q195,55 170,50 Q145,45 160,30 Z" fill="${color1}" fill-opacity="0.25"/>
        <rect x="130" y="20" width="6" height="6" fill="${color2}" fill-opacity="0.4" transform="rotate(45 133 23)"/>
        <rect x="145" y="40" width="5" height="5" fill="${color1}" fill-opacity="0.4" transform="rotate(20 147.5 42.5)"/>
        <circle cx="120" cy="35" r="4" fill="${color2}" fill-opacity="0.35"/>
        <circle cx="180" cy="25" r="3" fill="${color1}" fill-opacity="0.3"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  const background = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity * 0.3}">
      <defs>
        <pattern id="confetti" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect x="10" y="10" width="4" height="4" fill="${color1}" fill-opacity="0.15" transform="rotate(30 12 12)"/>
          <rect x="40" y="35" width="3" height="3" fill="${color2}" fill-opacity="0.12" transform="rotate(60 41.5 36.5)"/>
          <circle cx="30" cy="50" r="2" fill="${color1}" fill-opacity="0.1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#confetti)"/>
    </svg>
  `;
  return { background };
}

// Generate minimal decorations (subtle corners, thin lines)
function generateMinimalDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const baseSize = 80 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M0,40 L0,0 L40,0" stroke="${color1}" stroke-width="2" fill="none" stroke-opacity="0.4"/>
      <circle cx="5" cy="5" r="3" fill="${color1}" fill-opacity="0.3"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M80,40 L80,80 L40,80" stroke="${color1}" stroke-width="2" fill="none" stroke-opacity="0.4"/>
      <circle cx="75" cy="75" r="3" fill="${color1}" fill-opacity="0.3"/>
    </svg>
  `;

  const topRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M40,0 L80,0 L80,40" stroke="${color1}" stroke-width="2" fill="none" stroke-opacity="0.4"/>
      <circle cx="75" cy="5" r="3" fill="${color1}" fill-opacity="0.3"/>
    </svg>
  `;

  const bottomLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M0,40 L0,80 L40,80" stroke="${color1}" stroke-width="2" fill="none" stroke-opacity="0.4"/>
      <circle cx="5" cy="75" r="3" fill="${color1}" fill-opacity="0.3"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, topRight, bottomLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${120 * scale}" height="${30 * scale}" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <line x1="0" y1="15" x2="100" y2="15" stroke="${color1}" stroke-width="1" stroke-opacity="0.3"/>
        <circle cx="110" cy="15" r="4" fill="${color1}" fill-opacity="0.25"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  return { topLeft, bottomRight };
}

// Generate tech decorations (circuits, nodes, connections)
function generateTechDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const color2 = getColor(config.colorSource, colors, 1);
  const baseSize = 130 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <line x1="0" y1="20" x2="40" y2="20" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="40" y1="20" x2="40" y2="50" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="40" y1="50" x2="70" y2="50" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="0" y1="60" x2="25" y2="60" stroke="${color2}" stroke-width="1.5" stroke-opacity="0.25"/>
      <line x1="25" y1="60" x2="25" y2="90" stroke="${color2}" stroke-width="1.5" stroke-opacity="0.25"/>
      <circle cx="40" cy="20" r="4" fill="${color1}" fill-opacity="0.4"/>
      <circle cx="40" cy="50" r="4" fill="${color1}" fill-opacity="0.4"/>
      <circle cx="70" cy="50" r="5" fill="${color2}" fill-opacity="0.35"/>
      <circle cx="25" cy="60" r="3" fill="${color2}" fill-opacity="0.3"/>
      <rect x="55" y="75" width="12" height="12" rx="2" stroke="${color1}" stroke-width="1.5" fill="none" stroke-opacity="0.25"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <line x1="130" y1="110" x2="90" y2="110" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="90" y1="110" x2="90" y2="80" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="90" y1="80" x2="60" y2="80" stroke="${color1}" stroke-width="2" stroke-opacity="0.3"/>
      <line x1="130" y1="70" x2="105" y2="70" stroke="${color2}" stroke-width="1.5" stroke-opacity="0.25"/>
      <line x1="105" y1="70" x2="105" y2="40" stroke="${color2}" stroke-width="1.5" stroke-opacity="0.25"/>
      <circle cx="90" cy="110" r="4" fill="${color1}" fill-opacity="0.4"/>
      <circle cx="90" cy="80" r="4" fill="${color1}" fill-opacity="0.4"/>
      <circle cx="60" cy="80" r="5" fill="${color2}" fill-opacity="0.35"/>
      <circle cx="105" cy="70" r="3" fill="${color2}" fill-opacity="0.3"/>
      <rect x="63" y="43" width="12" height="12" rx="2" stroke="${color1}" stroke-width="1.5" fill="none" stroke-opacity="0.25"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${180 * scale}" height="${50 * scale}" viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <line x1="100" y1="25" x2="140" y2="25" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.3"/>
        <line x1="140" y1="25" x2="140" y2="10" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.3"/>
        <line x1="140" y1="10" x2="170" y2="10" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.3"/>
        <circle cx="140" cy="25" r="4" fill="${color1}" fill-opacity="0.35"/>
        <circle cx="170" cy="10" r="3" fill="${color2}" fill-opacity="0.3"/>
        <rect x="155" y="30" width="10" height="10" rx="1" stroke="${color2}" stroke-width="1" fill="none" stroke-opacity="0.25"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  const background = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity * 0.4}">
      <defs>
        <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="40" cy="40" r="2" fill="${color1}" fill-opacity="0.15"/>
          <line x1="40" y1="42" x2="40" y2="80" stroke="${color1}" stroke-width="1" stroke-opacity="0.08"/>
          <line x1="42" y1="40" x2="80" y2="40" stroke="${color1}" stroke-width="1" stroke-opacity="0.08"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)"/>
    </svg>
  `;
  return { background };
}

// Generate creative decorations (bold artistic elements)
function generateCreativeDecorations(
  config: SVGDecorationConfig,
  colors: CVStyleColors
): SVGDecorationResult {
  const scale = scaleMultipliers[config.scale];
  const color1 = getColor(config.colorSource, colors, 0);
  const color2 = getColor(config.colorSource, colors, 1);
  const baseSize = 160 * scale;

  const topLeft = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M0,0 L80,0 L0,80 Z" fill="${color1}" fill-opacity="0.2"/>
      <circle cx="50" cy="30" r="15" fill="${color2}" fill-opacity="0.25"/>
      <circle cx="30" cy="60" r="10" fill="${color1}" fill-opacity="0.3"/>
      <path d="M70,70 Q90,50 110,70 Q130,90 110,110 Q90,130 70,110 Q50,90 70,70 Z" fill="${color2}" fill-opacity="0.15"/>
      <rect x="20" y="90" width="20" height="20" rx="4" fill="${color1}" fill-opacity="0.2" transform="rotate(15 30 100)"/>
    </svg>
  `;

  const bottomRight = `
    <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
      <path d="M160,160 L80,160 L160,80 Z" fill="${color1}" fill-opacity="0.2"/>
      <circle cx="110" cy="130" r="15" fill="${color2}" fill-opacity="0.25"/>
      <circle cx="130" cy="100" r="10" fill="${color1}" fill-opacity="0.3"/>
      <path d="M50,50 Q70,30 90,50 Q110,70 90,90 Q70,110 50,90 Q30,70 50,50 Z" fill="${color2}" fill-opacity="0.15"/>
      <rect x="120" y="50" width="20" height="20" rx="4" fill="${color1}" fill-opacity="0.2" transform="rotate(-15 130 60)"/>
    </svg>
  `;

  if (config.placement === 'corners') {
    return { topLeft, bottomRight };
  }

  if (config.placement === 'header') {
    const headerDecoration = `
      <svg width="${200 * scale}" height="${70 * scale}" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity}">
        <path d="M130,0 L200,0 L200,70 Z" fill="${color1}" fill-opacity="0.15"/>
        <circle cx="160" cy="35" r="12" fill="${color2}" fill-opacity="0.25"/>
        <circle cx="180" cy="20" r="8" fill="${color1}" fill-opacity="0.2"/>
        <rect x="140" y="45" width="15" height="15" rx="3" fill="${color2}" fill-opacity="0.2" transform="rotate(20 147.5 52.5)"/>
      </svg>
    `;
    return { topRight: headerDecoration };
  }

  const background = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${config.opacity * 0.3}">
      <defs>
        <pattern id="creative-shapes" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="8" fill="${color1}" fill-opacity="0.08"/>
          <rect x="60" y="60" width="15" height="15" rx="3" fill="${color2}" fill-opacity="0.06" transform="rotate(30 67.5 67.5)"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#creative-shapes)"/>
    </svg>
  `;
  return { background };
}

// Main dispatcher function
export function generateSVGDecorations(
  config: SVGDecorationConfig | undefined,
  colors: CVStyleColors
): SVGDecorationResult | null {
  if (!config || !config.enabled || config.theme === 'none') {
    return null;
  }

  switch (config.theme) {
    case 'geometric':
      return generateGeometricDecorations(config, colors);
    case 'organic':
      return generateOrganicDecorations(config, colors);
    case 'abstract':
      return generateAbstractDecorations(config, colors);
    case 'minimal':
      return generateMinimalDecorations(config, colors);
    case 'tech':
      return generateTechDecorations(config, colors);
    case 'creative':
      return generateCreativeDecorations(config, colors);
    default:
      return null;
  }
}

// Helper to get theme description for UI
export function getSVGThemeDescription(theme: SVGDecorationConfig['theme']): string {
  const descriptions: Record<SVGDecorationConfig['theme'], string> = {
    none: 'No decorations',
    geometric: 'Circles, lines, and triangles - modern tech feel',
    organic: 'Leaves, waves, and curves - natural and creative',
    abstract: 'Blobs, confetti, and splashes - playful and unique',
    minimal: 'Subtle corner accents and thin lines - clean and professional',
    tech: 'Circuit patterns and nodes - IT and technology focused',
    creative: 'Bold artistic elements - design and art industry',
  };
  return descriptions[theme];
}

// Helper to suggest theme based on industry/formality
export function suggestSVGTheme(
  industry: string,
  formalityLevel: 'casual' | 'professional' | 'formal'
): SVGDecorationConfig['theme'] {
  // Formal industries should not have SVG decorations
  if (formalityLevel === 'formal') {
    return 'none';
  }

  const industryLower = industry.toLowerCase();

  // Tech industry
  if (industryLower.includes('tech') || industryLower.includes('software') || industryLower.includes('it')) {
    return formalityLevel === 'casual' ? 'tech' : 'minimal';
  }

  // Creative industry
  if (industryLower.includes('design') || industryLower.includes('art') || industryLower.includes('creative')) {
    return formalityLevel === 'casual' ? 'creative' : 'abstract';
  }

  // Marketing
  if (industryLower.includes('marketing') || industryLower.includes('advertising')) {
    return 'abstract';
  }

  // Startups
  if (industryLower.includes('startup')) {
    return 'geometric';
  }

  // Environmental, health, wellness
  if (industryLower.includes('environment') || industryLower.includes('health') || industryLower.includes('wellness')) {
    return 'organic';
  }

  // Default for professional casual
  if (formalityLevel === 'professional') {
    return 'minimal';
  }

  // Default for casual
  return 'geometric';
}

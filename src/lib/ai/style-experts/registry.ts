/**
 * Per-level style-expert lookup.
 *
 * Adding a new creativity level: implement StyleExpert in a new file under
 * style-experts/ and add it here.
 */

import type { StyleCreativityLevel } from '@/types';
import type { StyleExpert } from './types';
import { conservativeExpert } from './conservative';
import { balancedExpert } from './balanced';
import { creativeExpert } from './creative';
import { experimentalExpert } from './experimental';

const REGISTRY: Record<StyleCreativityLevel, StyleExpert> = {
  conservative: conservativeExpert,
  balanced: balancedExpert,
  creative: creativeExpert,
  experimental: experimentalExpert,
};

export function getStyleExpert(level: StyleCreativityLevel): StyleExpert {
  return REGISTRY[level] || REGISTRY.balanced;
}

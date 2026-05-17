/**
 * Maps the legacy `StyleCreativityLevel` (5 options including the dropped
 * `editorial-paper`) to the new cv-engine `Route` enum (4 options). Used
 * at the API boundary so existing client code keeps sending the legacy
 * values without modification.
 */

import type { StyleCreativityLevel } from '@/types';
import type { Route } from '../spec';

export function creativityLevelToRoute(level: StyleCreativityLevel): Route {
  switch (level) {
    case 'conservative':
      return 'safe';
    case 'balanced':
      return 'balanced';
    case 'creative':
      return 'creative';
    case 'experimental':
      return 'experimental';
    case 'editorial-paper':
      // editorial-paper's branded navy/cream/clay palette lives in
      // `balanced/press` in the new engine. See /NOTICE + that recipe's
      // SKILL.md for the adaptation.
      return 'balanced';
    default:
      return 'balanced';
  }
}

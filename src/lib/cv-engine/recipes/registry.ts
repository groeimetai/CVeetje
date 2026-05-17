/**
 * Recipe registry — static imports, typed, browser-safe.
 *
 * Each recipe lives in its own folder under recipes/{route}/{name}/ with:
 *   - SKILL.md      — canonical Markdown source (used by the AI orchestrator
 *                     server-side for prompt-body content; vendored from
 *                     nexu-io/open-design where applicable, see /NOTICE)
 *   - spec.ts       — typed DesignSpec export, statically imported here so
 *                     the renderer + tweak UI can read it in the browser
 *   - DESIGN.md?    — optional palette/typography token reference (Phase 1+)
 *   - assets/?      — optional template fixtures
 *
 * Adding a recipe: create the folder + spec.ts + SKILL.md, then add the
 * import line below. The registry's typed map gives compile-time errors if
 * you forget either step.
 */

import type { DesignSpec, Route } from '../spec';
import { spec as safeMonolith } from './safe/monolith/spec';
import { spec as safeClerk } from './safe/clerk/spec';
import { spec as safePlate } from './safe/plate/spec';
import { spec as balancedStudio } from './balanced/studio/spec';
import { spec as balancedPress } from './balanced/press/spec';
import { spec as balancedGrid } from './balanced/grid/spec';
import { spec as creativeKinfolk } from './creative/kinfolk/spec';
import { spec as creativeGentlewoman } from './creative/gentlewoman/spec';
import { spec as creativeWallpaper } from './creative/wallpaper/spec';
import { spec as experimentalManifesto } from './experimental/manifesto/spec';
import { spec as experimentalGallery } from './experimental/gallery/spec';
import { spec as experimentalBroadcast } from './experimental/broadcast/spec';

// ============ Static recipe map ============
//
// Map keys = DesignSpec.id (e.g. 'balanced/studio'). The const assertion +
// satisfies clause give us autocomplete on `getRecipeById('balanced/...')`
// at call sites without locking the type to the literal union.

const RECIPES = {
  'safe/monolith': safeMonolith,
  'safe/clerk': safeClerk,
  'safe/plate': safePlate,
  'balanced/studio': balancedStudio,
  'balanced/press': balancedPress,
  'balanced/grid': balancedGrid,
  'creative/kinfolk': creativeKinfolk,
  'creative/gentlewoman': creativeGentlewoman,
  'creative/wallpaper': creativeWallpaper,
  'experimental/manifesto': experimentalManifesto,
  'experimental/gallery': experimentalGallery,
  'experimental/broadcast': experimentalBroadcast,
} as const satisfies Record<string, DesignSpec>;

export type RecipeId = keyof typeof RECIPES;

// ============ Public API ============

export function getRecipeById(id: string): DesignSpec | undefined {
  return RECIPES[id as RecipeId];
}

export function listRecipesByRoute(route: Route): DesignSpec[] {
  return Object.values(RECIPES).filter(r => r.route === route);
}

export function getAllRecipes(): DesignSpec[] {
  return Object.values(RECIPES);
}

export function getAllRecipeIds(): string[] {
  return Object.keys(RECIPES);
}

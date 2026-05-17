/**
 * Server-side loader for recipe SKILL.md body content. Strips the YAML
 * frontmatter and returns the markdown body, cached in memory after first
 * read.
 *
 * SKILL.md content is fed into the AI prompt stack via composeSystemPrompt
 * — the body is the "brand voice" the AI reads to understand what the
 * recipe is asking for. Frontmatter is already parsed into the typed
 * DesignSpec elsewhere.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const cache = new Map<string, string>();

/** Strip YAML frontmatter (between leading `---` lines) and return the body. */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return (match ? match[1] : content).trim();
}

export async function loadSkillBody(recipeId: string): Promise<string> {
  if (cache.has(recipeId)) return cache.get(recipeId)!;
  const [route, name] = recipeId.split('/');
  if (!route || !name) throw new Error(`Invalid recipeId "${recipeId}"`);
  const path = join(process.cwd(), 'src', 'lib', 'cv-engine', 'recipes', route, name, 'SKILL.md');
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (err) {
    console.warn(`[cv-engine] SKILL.md not found for ${recipeId} at ${path}; using empty body.`);
    cache.set(recipeId, '');
    return '';
  }
  const body = stripFrontmatter(raw);
  cache.set(recipeId, body);
  return body;
}

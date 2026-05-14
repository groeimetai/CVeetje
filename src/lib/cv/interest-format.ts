// Interests on the generated CV may be either a bare hobby name ("Schaken")
// or a hobby with a short vacancy-relevant framing ("Schaken — strategisch denken").
// The em-dash with surrounding spaces is the canonical separator the prompt
// asks the model to use; we also accept a few common variants the model
// sometimes substitutes, then normalize back to canonical on render.

export const INTEREST_FRAMING_SEPARATOR = ' — ';

const ACCEPTED_SEPARATORS = [' — ', ' – ', ' - ', ': '];

export function splitInterest(item: string): { name: string; framing: string | null } {
  const trimmed = item.trim();
  for (const sep of ACCEPTED_SEPARATORS) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0) {
      const name = trimmed.slice(0, idx).trim();
      const framing = trimmed.slice(idx + sep.length).trim();
      if (name && framing) return { name, framing };
    }
  }
  return { name: trimmed, framing: null };
}

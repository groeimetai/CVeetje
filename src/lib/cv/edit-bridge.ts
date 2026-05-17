/**
 * Edit-bridge script — injected into the iframe HTML during PREVIEW mode.
 *
 * The script:
 *   1. Finds every element with a `data-id` attribute on the rendered CV.
 *   2. Marks them `contenteditable="true"` with a subtle hover-outline.
 *   3. On `blur` or Enter, captures `{ id, text }` and postMessages to the
 *      parent window: `{ type: 'cv-content-edit', id, text }`.
 *   4. Parent (`cv-preview.tsx`) maps the id back to a path in the
 *      GeneratedCVContent state and persists.
 *
 * NOT injected in PDF mode — see `forPdf` flag in html-generator.ts. The
 * PDF must render the same HTML for WYSIWYG fidelity but without any
 * outline / contenteditable styles or behaviour.
 */

/** Markup for the <style> block — applied only in preview. */
const EDIT_BRIDGE_CSS = `
  [data-id][data-cv-editable] {
    cursor: text;
    outline-offset: 2px;
    transition: outline-color 80ms ease, background-color 80ms ease;
    border-radius: 2px;
  }
  [data-id][data-cv-editable]:hover {
    outline: 1px dashed rgba(36, 99, 235, 0.55);
    background-color: rgba(36, 99, 235, 0.04);
  }
  [data-id][data-cv-editable]:focus {
    outline: 2px solid rgba(36, 99, 235, 0.7);
    background-color: rgba(36, 99, 235, 0.06);
  }
  /* Prevent the body's font-family from being overridden by the user
     accidentally pasting rich text from another app. */
  [data-id][data-cv-editable] * { font: inherit !important; color: inherit !important; }
`;

const EDIT_BRIDGE_SCRIPT = `
(function() {
  if (window.__cveetjeEditBridge) return;
  window.__cveetjeEditBridge = true;

  // The set of element-ids we never make editable (containers / wrappers
  // whose text comes from nested editable children, or stable affordances
  // that shouldn't be free-typed into).
  var SKIP = {
    'experience-0': 1, 'experience-1': 1, 'experience-2': 1, 'experience-3': 1,
    'experience-4': 1, 'experience-5': 1, 'experience-6': 1, 'experience-7': 1,
    'experience-8': 1, 'experience-9': 1,
    'education-0': 1, 'education-1': 1, 'education-2': 1, 'education-3': 1, 'education-4': 1,
    'project-0': 1, 'project-1': 1, 'project-2': 1, 'project-3': 1,
    'project-4': 1, 'project-5': 1, 'project-6': 1, 'project-7': 1,
    'entry-0': 1, 'entry-1': 1, 'entry-2': 1, 'entry-3': 1, 'entry-4': 1
  };

  function shouldEdit(id) {
    if (!id) return false;
    if (SKIP[id]) return false;
    if (id.indexOf('section-') === 0) return false;
    return true;
  }

  function tagAll() {
    var nodes = document.querySelectorAll('[data-id]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.getAttribute('data-id');
      if (!shouldEdit(id)) continue;
      if (el.hasAttribute('data-cv-editable')) continue;
      el.setAttribute('data-cv-editable', '1');
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
    }
  }

  function captureAndSend(el) {
    var id = el.getAttribute('data-id');
    if (!id) return;
    // Use textContent so we strip stray HTML from paste events
    var text = (el.textContent || '').replace(/\\s+$/, '');
    try {
      window.parent.postMessage(
        { type: 'cv-content-edit', id: id, text: text },
        '*'
      );
    } catch (err) { /* parent gone — preview unloaded */ }
  }

  function onBlur(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (!el.hasAttribute('data-cv-editable')) return;
    captureAndSend(el);
  }

  function onKeyDown(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (!el.hasAttribute('data-cv-editable')) return;
    // Enter on a single-line title flushes the edit + blurs (cancels newline).
    // Shift+Enter still inserts a newline for multi-line fields.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      el.blur();
    }
  }

  function onPaste(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (!el.hasAttribute('data-cv-editable')) return;
    // Strip formatting on paste — plain text only.
    e.preventDefault();
    var text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    if (document.execCommand) {
      document.execCommand('insertText', false, text);
    }
  }

  tagAll();
  document.addEventListener('blur', onBlur, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('paste', onPaste, true);

  // Re-tag when the srcDoc is rewritten and the script re-runs (Mutation-
  // Observer not strictly needed because srcDoc replace reloads everything).
})();
`;

/**
 * Build the inline `<style>` + `<script>` markup to inject right before
 * `</body>`. Returns empty string for PDF mode.
 */
export function buildEditBridgeMarkup(opts: { forPdf?: boolean } = {}): string {
  if (opts.forPdf) return '';
  return (
    '<style data-cv-bridge="1">' + EDIT_BRIDGE_CSS + '</style>' +
    '<script data-cv-bridge="1">' + EDIT_BRIDGE_SCRIPT + '</script>'
  );
}

/**
 * Payload shape posted from iframe to parent. Stable contract — bumping
 * the structure requires updating cv-preview.tsx in lockstep.
 */
export interface CVContentEditMessage {
  type: 'cv-content-edit';
  id: string;
  text: string;
}

export function isCVContentEditMessage(v: unknown): v is CVContentEditMessage {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return m.type === 'cv-content-edit'
    && typeof m.id === 'string'
    && typeof m.text === 'string';
}

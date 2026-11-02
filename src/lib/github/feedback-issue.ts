const GITHUB_REPO = 'groeimetai/CVeetje';

const FEEDBACK_LABELS: Record<string, string[]> = {
  feature_request: ['enhancement'],
  bug_report: ['bug'],
  general_feedback: ['feedback'],
};

export interface FeedbackIssueInput {
  type: string;
  title: string;
  fields: Record<string, unknown>;
  imageUrls: string[];
  /** Firebase uid van de indiener. Bewust GEEN e-mailadres: issues kunnen
   *  publiek zijn en e-mailadressen zijn persoonsgegevens (AVG). */
  submitterId: string;
}

export interface CreatedFeedbackIssue {
  number: number;
  url: string;
}

/** Neutraliseer @mentions en HTML-tags in door gebruikers aangeleverde tekst. */
export function sanitizeMarkdown(input: string): string {
  return input
    .slice(0, 10000)
    .replace(/@(?=[A-Za-z0-9-])/g, '@\u200b')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Alleen screenshots uit onze eigen Storage-bucket (feedback/upload). */
export function isOwnStorageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:'
      && (u.hostname === 'storage.googleapis.com' || u.hostname === 'firebasestorage.googleapis.com')
      && /\/feedback(\/|%2F)/.test(u.pathname);
  } catch {
    return false;
  }
}

function buildIssueBody({
  type,
  fields,
  imageUrls,
  submitterId,
}: FeedbackIssueInput): string {
  const sections: string[] = [];
  // User-tekst neutraliseren: geen @mentions (notificaties) en geen ruwe HTML.
  const f = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, typeof v === 'string' ? sanitizeMarkdown(v) : v]),
  ) as Record<string, unknown>;
  fields = f;

  sections.push(`**Type:** ${type.replace('_', ' ')}`);
  sections.push(`**Submitted by (uid):** \`${submitterId.replace(/[^A-Za-z0-9_-]/g, '')}\``);
  sections.push('');

  if (type === 'feature_request') {
    if (fields.description) sections.push(`## Description\n${fields.description}`);
    if (fields.priority) sections.push(`**Priority:** ${fields.priority}`);
    if (fields.useCase) sections.push(`## Use Case\n${fields.useCase}`);
    if (fields.expectedBehavior) sections.push(`## Expected Behavior\n${fields.expectedBehavior}`);
  } else if (type === 'bug_report') {
    if (fields.severity) sections.push(`**Severity:** ${fields.severity}`);
    if (fields.stepsToReproduce) sections.push(`## Steps to Reproduce\n${fields.stepsToReproduce}`);
    if (fields.expectedBehavior) sections.push(`## Expected Behavior\n${fields.expectedBehavior}`);
    if (fields.actualBehavior) sections.push(`## Actual Behavior\n${fields.actualBehavior}`);
    if (fields.browserInfo) sections.push(`## Browser/Device\n\`${fields.browserInfo}\``);
  } else if (type === 'general_feedback') {
    if (fields.category) sections.push(`**Category:** ${fields.category}`);
    if (fields.message) sections.push(`## Message\n${fields.message}`);
  }

  const safeImages = imageUrls.filter(isOwnStorageUrl);
  if (safeImages.length > 0) {
    sections.push(`## Screenshots\n${safeImages.map((url, i) => `![Screenshot ${i + 1}](${url})`).join('\n')}`);
  }

  sections.push('\n---\n*Automatically created from in-app feedback*');

  return sections.join('\n\n');
}

export async function createFeedbackGitHubIssue(
  input: FeedbackIssueInput,
): Promise<CreatedFeedbackIssue | null> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('[GitHub] GITHUB_TOKEN not configured — skipping issue creation');
    return null;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[${input.type.replace('_', ' ')}] ${sanitizeMarkdown(input.title).slice(0, 200)}`,
        body: buildIssueBody(input),
        labels: FEEDBACK_LABELS[input.type] || [],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { number: data.number, url: data.html_url };
    }
    console.error('[GitHub] Issue creation failed:', res.status, await res.text());
    return null;
  } catch (error) {
    console.error('[GitHub] Issue creation error:', error);
    return null;
  }
}

export { GITHUB_REPO };

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
  userEmail: string;
}

export interface CreatedFeedbackIssue {
  number: number;
  url: string;
}

function buildIssueBody({
  type,
  fields,
  imageUrls,
  userEmail,
}: FeedbackIssueInput): string {
  const sections: string[] = [];

  sections.push(`**Type:** ${type.replace('_', ' ')}`);
  sections.push(`**Submitted by:** ${userEmail}`);
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

  if (imageUrls.length > 0) {
    sections.push(`## Screenshots\n${imageUrls.map((url, i) => `![Screenshot ${i + 1}](${url})`).join('\n')}`);
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
        title: `[${input.type.replace('_', ' ')}] ${input.title}`,
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

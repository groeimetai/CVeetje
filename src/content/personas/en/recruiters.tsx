import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'recruiters';
export const locale: PersonaPage['locale'] = 'en';
export const title = 'CVeetje for recruiters — what it does to your inflow, and what it can do for you';
export const description =
  'For in-house recruiters, agency recruiters, and staffing firms. What changes in your inflow as candidates use AI tools — and can you use it yourself for candidate presentations?';
export const hero =
  'AI CV tools change recruitment inflows. Not whether, but how. Here&apos;s a sober view of what an AI-generated CV is, what it isn&apos;t, and how to tell it apart from manual work.';
export const keywords = [
  'recruiter AI CV',
  'AI generated CV recruitment',
  'staffing agency AI tools',
  'modern recruitment',
];
export const relatedBlogSlugs = [
  'recruiter-perspective',
  'chatgpt-vs-cveetje',
  'ats-cv-2026',
  'cv-tailored-in-two-minutes',
];

export function Body() {
  return (
    <>
      <h2>What&apos;s shifting in 2026</h2>
      <p>
        Many more candidates use AI to build their CVs. That&apos;s not a hunch — it&apos;s what every
        recruitment conversation confirms. The question shifts from &quot;is this real?&quot; to &quot;how
        good is the content and what does it say about the candidate?&quot;.
      </p>
      <p>
        Honest reality: an AI-generated CV with a human read is typically better structured than a
        manual CV from an inexperienced candidate. This isn&apos;t a regression in inflow — it&apos;s a
        shift in where the value-add lives.
      </p>

      <h2>How to recognise a CVeetje CV (and what that means)</h2>
      <p>
        We use no hidden watermark. Patterns you may notice:
      </p>
      <ul>
        <li>Strong profile summary in 2–3 sentences.</li>
        <li>Experience with varied bullet lengths and concrete outcomes.</li>
        <li>ATS-friendly structure, even in the more creative styles.</li>
        <li>No skill-soup — typically a focused set of six to eight skills.</li>
      </ul>

      <h2>What does it say about the candidate?</h2>
      <p>
        A well-crafted AI CV isn&apos;t laziness. It&apos;s someone spending time differently — on
        interview preparation rather than Word styling. For most roles, that&apos;s a positive signal.
      </p>
      <p>
        For some roles a manual CV might signal more (a copywriting position, for instance). There you
        can just ask: &quot;How did you build this CV?&quot;. A good candidate answers without
        embarrassment and explains what AI did and what they edited.
      </p>

      <h2>Recruiters using CVeetje for their own work</h2>
      <ol>
        <li>
          <strong>Candidate presentation to clients.</strong> Present staffed candidates &quot;in your
          house style&quot; via a custom DOCX template.
        </li>
        <li>
          <strong>Pool CVs for staffing firms.</strong> One candidate, multiple variants per project
          type.
        </li>
        <li>
          <strong>Talent profiles.</strong> Same flow as a CV but for headhunting positioning.
        </li>
      </ol>

      <h2>What we deliberately don&apos;t do</h2>
      <ul>
        <li>Synthesise work history when the candidate provides nothing.</li>
        <li>Invent metrics that weren&apos;t in the source material.</li>
        <li>Inflate claims on regeneration — the gatekeeper step requires evidence.</li>
      </ul>
    </>
  );
}

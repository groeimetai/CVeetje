import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'cv-tailored-in-two-minutes',
  locale: 'en',
  title: 'Tailoring a CV in two minutes — how it works without the cringe',
  description:
    'The &quot;one CV for everything&quot; advice is dead. Here&apos;s how to make a job-specific CV in two minutes without fighting Word.',
  publishedAt: '2026-05-01',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'how-to',
  personas: ['werkzoekenden', 'zij-instromers'],
  keywords: ['tailored CV', 'AI CV builder', 'CV per job', 'job application CV', 'CV targeting'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Recruiters spend six to ten seconds on a first CV scan. A generic CV rarely earns those seconds
        because it tries to be everything to everyone. Tailoring per job used to take an hour in Word.
        It doesn&apos;t anymore. Here&apos;s the actual workflow.
      </p>

      <h2>What happens in the two minutes</h2>
      <ol>
        <li>
          <strong>The job ad gets parsed.</strong> Hard requirements, nice-to-haves, and repeated
          terminology are extracted. Both &quot;Product Owner&quot; and &quot;PO&quot; get noted —
          they&apos;re not the same string to an ATS.
        </li>
        <li>
          <strong>Your experience gets matched.</strong> Nothing invented. Roles get reordered so the
          relevant ones surface first. An old role that suddenly fits gets more space; an unrelated job
          shrinks.
        </li>
        <li>
          <strong>Bullets are reframed.</strong> Same facts, different lens. &quot;Improved onboarding
          flow&quot; becomes &quot;activated new users (+12%)&quot; for a growth role and &quot;reduced
          first-week tickets by 30%&quot; for an ops role — only if those numbers exist in your source
          material.
        </li>
        <li>
          <strong>Style gets chosen.</strong> Bank: Conservative. Design studio: Creative or Editorial.
          Override at will.
        </li>
        <li>
          <strong>You check.</strong> Preview before download. Disagree with a claim? &quot;Disagree&quot;
          button explains why and triggers a revision — free if the claim is wrong.
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">What this doesn&apos;t do</div>
        <p>
          Invent experience. Inflate skills you&apos;ve never touched. Stretch dates. The honesty rules
          are baked into the prompts — if it&apos;s not in your input, it doesn&apos;t go on the CV.
          Not marketing, just how this stays usable across a job hunt.
        </p>
      </div>

      <h2>The actual time budget</h2>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>First time</th>
            <th>Subsequent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Profile setup</td>
            <td>10 min</td>
            <td>0 — already done</td>
          </tr>
          <tr>
            <td>Paste job + generate</td>
            <td>1 min</td>
            <td>1 min</td>
          </tr>
          <tr>
            <td>Pick style</td>
            <td>30 sec</td>
            <td>10 sec</td>
          </tr>
          <tr>
            <td>Read + finetune</td>
            <td>3–5 min</td>
            <td>1–2 min</td>
          </tr>
          <tr>
            <td>Download PDF</td>
            <td>5 sec</td>
            <td>5 sec</td>
          </tr>
        </tbody>
      </table>

      <p>
        Two minutes is generation plus download. The honest end-to-end time including a read-through is
        four to five minutes per application. That&apos;s an order of magnitude faster than the typical
        Word workflow, and the output is more targeted.
      </p>

      <h2>Common questions</h2>
      <details>
        <summary>Doesn&apos;t the AI go off the rails creatively?</summary>
        <div>
          You pick the creativity level. Conservative produces a quiet, classic layout for a law firm.
          Experimental or Editorial gives a design studio a visual signature. Nothing changes about the
          facts — only the presentation.
        </div>
      </details>
      <details>
        <summary>Does it work without LinkedIn?</summary>
        <div>
          Yes. Fill in your profile manually, or upload an existing CV (PDF). The tool works with what
          you put in — no scraping of external profiles.
        </div>
      </details>
      <details>
        <summary>Isn&apos;t this just ChatGPT with a wrapper?</summary>
        <div>
          No. ChatGPT can do this if you prompt well, between five other tabs. CVeetje does three things
          ChatGPT doesn&apos;t out of the box: keeps your profile as structured data (consistent
          regenerations), renders to real PDFs in multiple styles, and has honesty rules to prevent
          fabrication. Plus you don&apos;t paste your context every time.
        </div>
      </details>

      <h2>Try it</h2>
      <p>
        Fifteen free credits per month — enough for one full CV, no credit card. If you want more, buy
        credits or use your own API key. One generated CV is usually enough to tell if this fits your
        workflow.
      </p>
    </>
  );
}

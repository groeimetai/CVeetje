import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'linkedin-to-cv-30-seconds',
  locale: 'en',
  title: 'From LinkedIn export to finished CV in 30 seconds — what really happens',
  description:
    'The LinkedIn profile PDF as a starting point. What the parser extracts, what surprises it, and the manual fields you should fill in.',
  publishedAt: '2025-12-20',
  updatedAt: '2026-05-15',
  readingMinutes: 6,
  category: 'how-to',
  personas: ['werkzoekenden', 'studenten', 'zij-instromers'],
  keywords: ['LinkedIn to CV', 'LinkedIn PDF resume', 'profile import CV', 'LinkedIn export'],
  author: 'team',
  howTo: {
    name: 'Turn your LinkedIn profile into a CV with CVeetje',
    totalTimeMinutes: 5,
    steps: [
      {
        name: 'Export your LinkedIn profile as PDF',
        text: 'On your profile → More → Save as PDF. Download the file.',
      },
      {
        name: 'Upload to CVeetje',
        text: 'In profile setup, choose &quot;LinkedIn PDF&quot; and upload.',
      },
      {
        name: 'Wait 10–30 seconds',
        text: 'The parser reads experience, education, skills, certifications, languages.',
      },
      {
        name: 'Verify and fill in',
        text: 'Nationality and hobbies don&apos;t come from LinkedIn — add them if you want them on your CV.',
      },
      {
        name: 'Generate first CV',
        text: 'Paste a job ad and click generate. First CV in about two minutes.',
      },
    ],
  },
};

export function Body() {
  return (
    <>
      <p className="lede">
        Most people already have their work history neatly organised somewhere — on LinkedIn.
        That&apos;s a great start. Here&apos;s what happens when you feed that PDF in, and what
        you&apos;ll need to do afterwards.
      </p>

      <h2>First: how to get the PDF</h2>
      <p>
        On LinkedIn, go to your own profile. Click &quot;More&quot; (under your photo) and pick
        &quot;Save to PDF&quot;. The file downloads directly — usually named &quot;Profile.pdf&quot;.
      </p>
      <p>
        Not new — it&apos;s existed for years. What many people don&apos;t realise is that this PDF is
        surprisingly structured: headings, date fields, language blocks — all in a format a parser can
        recognise.
      </p>

      <h2>What the parser extracts</h2>
      <ul>
        <li>Name, location, contact details.</li>
        <li>Profile summary (the &quot;About&quot; section).</li>
        <li>Experience in chronological order. Per role: title, company, period, description.</li>
        <li>Education: institution, field, period.</li>
        <li>Skills — including LinkedIn&apos;s subgroupings.</li>
        <li>Certifications with date and issuer.</li>
        <li>Languages with proficiency.</li>
        <li>Volunteer experience.</li>
        <li>Publications and projects — if filled in.</li>
        <li>Birth date — since a 2026 update, picked up if present.</li>
      </ul>

      <h2>What does NOT come automatically</h2>
      <ul>
        <li>
          <strong>Nationality.</strong> LinkedIn doesn&apos;t ask. Fill it in separately if your CV
          target market expects it.
        </li>
        <li>
          <strong>Marital status.</strong> Doesn&apos;t belong on a modern CV anyway — leave it off.
        </li>
        <li>
          <strong>Concrete project outcomes.</strong> What&apos;s on LinkedIn is often general. For a
          targeted CV you want measurable impact per role. Add manually — the tool helps with framing,
          but the facts come from you.
        </li>
        <li>
          <strong>A photo.</strong> Default is no photo. Upload one separately. Your LinkedIn photo
          isn&apos;t pulled in automatically — privacy reasons.
        </li>
        <li>
          <strong>Recent personal work.</strong> Open source, side projects, your own ventures —
          anything not on LinkedIn, add separately.
        </li>
      </ul>

      <h2>Common mistakes with LinkedIn imports</h2>
      <h3>1. An empty LinkedIn</h3>
      <p>
        If your profile is three role lines and no descriptions, you get empty raw material. Fix
        LinkedIn first. Ten minutes there saves an hour in CV setup.
      </p>

      <h3>2. Outdated roles not pruned</h3>
      <p>
        A nine-year-old job nobody cares about needs to go, or at least shrink. That&apos;s not
        LinkedIn&apos;s job — it&apos;s the CV&apos;s. Good news: in CVeetje this happens
        automatically during profile setup. Old roles are condensed to one line if they don&apos;t seem
        relevant to what you&apos;re seeking.
      </p>

      <h3>3. Silent LinkedIn-speak</h3>
      <p>
        LinkedIn has its own language: &quot;connecting people&quot;, &quot;passion for data&quot;,
        &quot;servant leader&quot;. A parser takes that literally. But on a CV it&apos;s weak. The
        tool will try to make it more concrete during generation — but read your profile summary in
        CVeetje once and rewrite what sounds too fluffy.
      </p>

      <div className="callout">
        <div className="callout-title">No LinkedIn?</div>
        <p>
          No problem. Fill in your profile manually — a wizard guides you. Or upload an existing CV
          (PDF) and start there. A Word CV works too, but PDF is more robust because the text layer is
          more stable.
        </p>
      </div>

      <h2>After import: the actual work</h2>
      <ol>
        <li>
          <strong>Read your profile summary.</strong> Does it sound like you? Is it specific enough?
        </li>
        <li>
          <strong>Add concrete proof.</strong> One or two bullets per recent role with measurable
          outcomes. Not every role — only where you have them.
        </li>
        <li>
          <strong>Update skills to current.</strong> Not all 47 LinkedIn stored — the top five or six
          you really use in 2026.
        </li>
      </ol>
      <p>
        Ten minutes, and your profile is a strong base for unlimited targeted CVs over the months
        ahead.
      </p>
    </>
  );
}

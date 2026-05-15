import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'ats-cv-2026',
  locale: 'en',
  title: 'ATS systems in 2026 — what actually works, what&apos;s myth',
  description:
    'No PDF panic, no table phobia, no nonsense about white space. A sober look at how modern ATS systems process your CV in 2026 — and what really matters.',
  publishedAt: '2026-04-22',
  updatedAt: '2026-05-15',
  readingMinutes: 9,
  category: 'guide',
  personas: ['werkzoekenden', 'recruiters', 'zij-instromers'],
  keywords: ['ATS CV', 'Applicant Tracking System', 'ATS-friendly CV', 'resume parser', 'CV keywords'],
  author: 'editorial',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Half the internet has shouted since 2018 that your CV won&apos;t get through &quot;the
        ATS&quot; if you use emoji bullets or a table around your work history. The 2026 reality is
        calmer, but more honest. Here&apos;s what actually happens.
      </p>

      <h2>What an ATS actually does</h2>
      <p>
        First and foremost it&apos;s a database. It accepts your application, stores it, links it to a
        job, and gives recruiters an interface to browse. That&apos;s the base product. Parsing,
        scoring, ranking — those vary wildly between systems and implementations.
      </p>
      <p>
        The major systems are Workday, SuccessFactors, Greenhouse, Lever, SmartRecruiters, Recruitee,
        and Homerun. Some do sophisticated parsing; others show your CV as a PDF next to a form the
        candidate filled in. Score-and-rank pain is mostly at large-scale recruiters — staffing
        agencies, retail chains, large enterprises — that have advanced modules switched on.
      </p>

      <h2>What ATS software actually gets wrong in practice</h2>
      <ul>
        <li>
          <strong>Mixing up multi-column text.</strong> A two-column layout sometimes gets read
          left-to-right, mixing &quot;Experience&quot; and your skills list. Single column is safer.
        </li>
        <li>
          <strong>Missing text in images.</strong> Don&apos;t embed your name in a graphical banner.
          Skill icons are fine, but the skill name needs to be real text too.
        </li>
        <li>
          <strong>Inconsistent dates.</strong> Use &quot;Jan 2022 – present&quot; or
          &quot;01/2022–now&quot;, not &quot;sometime mid-2022&quot;. Parsers handle multiple formats,
          but only if you&apos;re consistent.
        </li>
      </ul>

      <h2>Myths we can move past</h2>
      <h3>1. &quot;PDF doesn&apos;t work — only .docx&quot;</h3>
      <p>
        Outdated. Since around 2019 virtually every modern ATS handles PDFs fine. A PDF with a real
        text layer (like the ones CVeetje generates) is usually more parseable than a Word doc with
        tracked changes and bullet glyphs that render differently in each Word version.
      </p>
      <p>
        What you don&apos;t want: a PDF that&apos;s really a scan of a paper CV — an image without a
        text layer. Every parser trips over those.
      </p>

      <h3>2. &quot;Tables are deadly&quot;</h3>
      <p>
        Nuanced. A structured table with a logical reading order (row by row, labelled) is parsed fine
        by 80% of modern systems. A decorative grid table used to align icons can fail. CVeetje renders
        all styles except Editorial and Experimental without tables; the creative styles use flat,
        single-column tables.
      </p>

      <h3>3. &quot;Keywords must match exactly&quot;</h3>
      <p>
        Half true. Hard keywords (job titles, certifications, tools) should match literally — many
        systems still do string matching. Soft terms (skills, jargon) are increasingly matched
        semantically; vary those. Safest rule: hard keywords verbatim, soft terms in your own words.
      </p>

      <h3>4. &quot;ATSes reject you&quot;</h3>
      <p>
        Almost never. People decide, not machines. An ATS sorts, filters, ranks — a recruiter ultimately
        decides to call or ghost. Real wins come from <em>how easily a human can read it in six
        seconds</em>, not how an algorithm scores it.
      </p>

      <div className="callout">
        <div className="callout-title">What you actually want</div>
        <p>
          A CV that&apos;s grasped in one go by both a human and a parser. Single column for the main
          body, recognisable section titles, consistent dates, and job-ad terms woven into role
          descriptions — not as a tag soup at the bottom.
        </p>
      </div>

      <h2>How CVeetje handles it</h2>
      <p>
        All five styles render from a structured data model. The underlying text stays the same, even
        in the most creative style. The PDF render uses Puppeteer with explicit print CSS — no
        transforms that confuse parsers, no clip-paths that hide text from the text layer. Links are
        clickable, headings are real headings.
      </p>
      <ul>
        <li>Single-column base layout in Conservative, Balanced, and Creative.</li>
        <li>
          Editorial and Experimental use visual columns, but the PDF text layer is linear — parsers
          read it as one continuous document.
        </li>
        <li>Keyword matching happens at the text level: terms get woven into role descriptions.</li>
        <li>Standard section headings in NL and EN, no creative euphemisms.</li>
      </ul>

      <h2>Quick checklist</h2>
      <div className="key-takeaways">
        <h3>ATS-healthy, human-friendly</h3>
        <ul>
          <li>PDF with real text layer — no scans.</li>
          <li>Single main column for work experience.</li>
          <li>Standard section titles in the job ad&apos;s language.</li>
          <li>Consistent dates: &quot;mmm yyyy&quot; or &quot;mm/yyyy&quot;.</li>
          <li>Hard keywords verbatim from the ad where they fit naturally.</li>
          <li>No text in images, no critical info in headers/footers.</li>
          <li>Max 2 MB, &quot;firstname-lastname-role.pdf&quot; as filename.</li>
        </ul>
      </div>

      <h2>What changes in 2026</h2>
      <p>
        More employers couple LLMs to their ATS for semantic matching. That sounds scary but
        practically means you have to puzzle slightly less with keywords — the match is softer. At the
        same time, EU AI Act compliance brings more transparency disclosures: an &quot;Was I assessed by
        an algorithm?&quot; button is showing up in more places.
      </p>
      <p>
        For you as a candidate, little changes fundamentally. An honest, well-structured, targeted CV
        remains the base. What changes is that the system is less forgiving of generic mass-CVs — their
        scores are more visible, and lower.
      </p>
    </>
  );
}

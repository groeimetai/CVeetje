import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'recruiter-perspective',
  locale: 'en',
  title: 'What a recruiter told us: &quot;I see 200 CVs a day — here are the patterns&quot;',
  description:
    'We spoke to corporate recruiters, agency consultants, and hiring managers. What stands out, what irritates, what moves a CV to the &quot;yes&quot; pile.',
  publishedAt: '2026-03-28',
  updatedAt: '2026-05-15',
  readingMinutes: 9,
  category: 'perspective',
  personas: ['werkzoekenden', 'recruiters', 'hiring-managers'],
  keywords: ['recruiter perspective', 'CV tips from recruiters', 'what recruiters look for', 'CV review'],
  author: 'team',
};

export function Body() {
  return (
    <>
      <p className="lede">
        In 2026 we called ten recruiters across different worlds — a staffing agency, a tech scale-up,
        a hospital, a government department, a law firm. No survey, no scientific breadth. Just:
        what stands out? What&apos;s worth telling candidates?
      </p>

      <h2>What they all opened with: opening lines</h2>
      <p>
        The first twenty words of your CV do disproportionate work. Recruiters don&apos;t skim to
        experience first — they look at your profile summary (or its absence). A strong opening line
        isn&apos;t marketing copy, it&apos;s an &quot;I know what role I&apos;m applying for&quot;
        signal.
      </p>
      <p>
        One of them, verbatim: &quot;If I see &lsquo;A driven professional with a passion for
        challenges&rsquo; at the top, I sigh and scroll. No animosity. It just says nothing. Give me
        &lsquo;Backend developer with seven years in Python, the last four in fintech, looking for a
        role with more ownership over data pipelines&rsquo; and you&apos;ve got me in one line.&quot;
      </p>

      <h2>Top irritations you can easily prevent</h2>
      <ol>
        <li>
          <strong>Distracting photos.</strong> Nobody expects a studio portrait. A holiday photo with
          your partner half cropped out is noise. A recent, calm photo with a neutral background is
          enough. Or no photo — both work.
        </li>
        <li>
          <strong>Experience without context.</strong> &quot;Software Engineer — Company X —
          2021–2023&quot; with nothing under it is a wasted line. One sentence about the product, what
          you did. Two bullets about what you built or changed.
        </li>
        <li>
          <strong>A four-page CV for three years of work.</strong> Not too long on principle —
          diluted in content. Under seven years of experience, two pages is plenty.
        </li>
        <li>
          <strong>Skills sections with everything you&apos;ve ever touched.</strong> What do you want
          me to do with thirty technologies? What are you actually good at? Which three do you use
          daily?
        </li>
        <li>
          <strong>Generic hobbies.</strong> &quot;Reading, films, hanging out with friends&quot; — that
          describes everyone. Either drop it or pick one specific thing that&apos;ll spark a question.
        </li>
      </ol>

      <h2>What they all appreciate</h2>
      <ul>
        <li>A two-to-three sentence profile summary tailored to this role.</li>
        <li>
          Concrete projects with measurable outcomes — not every bullet, but the highlights.
        </li>
        <li>
          Honest acknowledgement of a career switch or pause. &quot;I took six months for
          caregiving&quot; isn&apos;t a red flag in 2026 — an unexplained gap is.
        </li>
        <li>
          Explicit fit-with-this-role in your summary or cover letter — not by copying the job ad, but
          by naming why this role makes sense now.
        </li>
      </ul>

      <h2>The thing nobody discusses: AI CVs</h2>
      <p>
        We asked everyone: can you tell when a CV is AI-generated? Three of ten said &quot;yes,
        sometimes you can feel it&quot;. One had a concrete example: &quot;Bullets that are all roughly
        the same length, opening with a verb plus &lsquo;successfully&rsquo; or
        &lsquo;effectively&rsquo; and a result — that pattern is an AI tell.&quot; Six of ten said
        &quot;no idea, and I don&apos;t care as long as the content&apos;s accurate.&quot;
      </p>
      <p>
        Conclusion: AI use isn&apos;t a stigma, but a raw AI-generated CV without a human pass is
        recognisable. A few irregular bullet lengths, an idiosyncratic observation, a personal edge in
        your summary — those small things lift it across the &quot;typed by a human&quot; threshold.
      </p>

      <h2>Cover letters: more sensitive territory</h2>
      <p>
        Here the split was bigger. Half read them carefully, half only when the CV stack is close.
        What <em>everyone</em> noticed: the standard opening. &quot;With great enthusiasm I&apos;m
        applying for...&quot; causes physical pain in some recruiters.
      </p>
      <p>
        One: &quot;The first paragraph should <em>tell</em> me something. Not that you&apos;re applying
        — I see that already. Something concrete about why this company, or this role, matters to you
        right now. Start in the middle of a thought. Stop with the formal lead-in.&quot;
      </p>

      <div className="callout">
        <div className="callout-title">Practical tip</div>
        <p>
          Write your cover letter in two passes. First: dump everything you want to say. Second: cut
          the opening paragraph. Almost always your real story starts at paragraph two. Try it — it
          works astonishingly often.
        </p>
      </div>

      <h2>What we take from this for CVeetje</h2>
      <p>
        This kind of conversation shapes why we build the tool the way we do. The profile summary is a
        first-class citizen in every generated CV, not an afterthought. Bullets vary in length. Cover
        letters never start with &quot;With great enthusiasm&quot;, and the humanizer pass actively
        looks for the patterns recruiters named. Not perfect — but built from what gets seen at the
        other side of the desk.
      </p>
    </>
  );
}

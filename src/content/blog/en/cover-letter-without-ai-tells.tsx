import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'cover-letter-without-ai-tells',
  locale: 'en',
  title: 'Writing a cover letter with AI without sounding like AI',
  description:
    'The typical AI tells in cover letters, why recruiters bristle at them, and how to do a second pass that makes the difference.',
  publishedAt: '2026-03-15',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'how-to',
  personas: ['werkzoekenden', 'zij-instromers'],
  keywords: ['AI cover letter', 'cover letter generator', 'humanizer', 'AI tells cover letter'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        A good cover letter opens a door your CV only cracks. A bad cover letter closes a door your CV
        had just opened. AI makes it faster, but easier in both directions. Here&apos;s how to lean
        toward the first.
      </p>

      <h2>Typical AI tells</h2>
      <p>
        A handful of patterns every modern language model produces, and that recruiters now recognise.
        Not because AI use is wrong — most recruiters use it themselves — but because an unedited AI
        text has a tasteless politeness nobody finds anything to say about.
      </p>
      <ul>
        <li>
          <strong>The inflated opener.</strong> &quot;With great enthusiasm&quot;, &quot;With genuine
          pleasure&quot;, &quot;I am thrilled&quot; — meat with no flavour.
        </li>
        <li>
          <strong>The rule of three.</strong> &quot;My passion for X, my experience in Y, and my drive
          to Z&quot;. People don&apos;t think in clean triplets. Language models do.
        </li>
        <li>
          <strong>Empty adjectives.</strong> &quot;Leading, innovative, dynamic&quot;. Has the company
          called itself that? Do you actually have an opinion on what they&apos;re like? Replace or
          drop.
        </li>
        <li>
          <strong>Negative parallelism.</strong> &quot;Not only X, but also Y&quot;. Two of these in a
          letter and you can hear the algorithm.
        </li>
        <li>
          <strong>Em-dash overuse.</strong> Subtlest tell, most consistent. Humans use a dash
          occasionally. LLMs throw them in every three sentences.
        </li>
        <li>
          <strong>The closing euphemism.</strong> &quot;I&apos;m looking forward to discussing how I
          can contribute to your team&quot;. That&apos;s a forced smile in writing.
        </li>
      </ul>

      <h2>What to do instead</h2>

      <h3>1. Start in the middle</h3>
      <p>
        Avoid the lead-in. No &quot;I am writing to apply for...&quot;. Open with something specific
        — an observation about the company, a relevant experience, a question about the role. The
        recruiter knows you&apos;re applying; the first line should give you a face.
      </p>

      <h3>2. One concrete example in ordinary language</h3>
      <p>
        Instead of &quot;I have extensive experience with cross-functional collaboration&quot;:
        &quot;In my last role I sat in the same standup as design, backend, and sales. It sounded like
        a disaster and became the reason our releases stopped slipping after six months.&quot; The
        second sounds like a person who lived something.
      </p>

      <h3>3. Say why <em>this</em> role, not just &quot;a&quot; role</h3>
      <p>
        Recruiters read the same standard letter in many flavours. &quot;I&apos;m looking for a
        challenge where I can grow&quot; isn&apos;t false, it&apos;s contextless. What is it about
        this role, this team, this company, this moment in your career that makes this the logical
        next step? One paragraph on that changes everything.
      </p>

      <h3>4. End without the formula</h3>
      <p>
        &quot;I look forward to a conversation where we can further explore...&quot; — nobody actually
        looks forward. Better: &quot;If you&apos;re curious where I&apos;d want to take X, give me a
        call.&quot; Or just stop. A letter can end where the story ends.
      </p>

      <h2>CVeetje&apos;s humanizer pass</h2>
      <p>
        Every generated cover letter goes through a second AI pass that reviews the first. The prompt
        leans on Wikipedia&apos;s &quot;signs of AI writing&quot; — a comprehensive list of patterns
        language models consistently produce. The pass targets:
      </p>
      <ul>
        <li>Inflated symbolism (&quot;beacon of&quot;, &quot;world of&quot;).</li>
        <li>Promotional tone without substance.</li>
        <li>Vague attributions (&quot;many people say&quot;, &quot;in today&apos;s world&quot;).</li>
        <li>Rule-of-three formula.</li>
        <li>Em-dash overuse.</li>
        <li>Filler phrases (&quot;It&apos;s important to note&quot;).</li>
        <li>AI vocabulary (&quot;leverage&quot;, &quot;robust&quot;, &quot;seamless&quot;).</li>
        <li>Passive voice where active fits.</li>
      </ul>
      <p>
        The pass doesn&apos;t rip these out mechanically — that would produce a new mechanical feel.
        The prompt asks for rewriting toward &quot;what a person would say, not what a chatbot would
        produce in a template&quot;.
      </p>

      <h2>What you have to do yourself</h2>
      <ol>
        <li>
          <strong>Read aloud.</strong> Anywhere it doesn&apos;t sound like you? Change it.
        </li>
        <li>
          <strong>Add one personal detail.</strong> A real preference, an odd observation, an opinion
          that isn&apos;t safe. This is what distinguishes a human from a well-edited AI text.
        </li>
        <li>
          <strong>Cut where you say nothing new.</strong> Three pages is too much. One-and-a-half is
          the max; half a page is enough if you have something concrete to say.
        </li>
      </ol>

      <div className="callout callout--success">
        <div className="callout-title">Does it work?</div>
        <p>
          Our internal tests compared letters with and without the humanizer pass. Recruiters we
          showed both versions to recognised the post-humanizer letters as AI-generated significantly
          less often than the raw versions. Not a perfect solution — a threshold lowered. A human
          reading along is still better, and that human is you.
        </p>
      </div>
    </>
  );
}

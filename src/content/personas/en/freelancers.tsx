import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'zzp';
export const locale: PersonaPage['locale'] = 'en';
export const title = 'CVeetje for freelancers and consultants — a CV per client, fast';
export const description =
  'For independent contractors. How to send a tailored CV with every proposal — making your rate easier to defend and your hit rate higher.';
export const hero =
  'As a freelancer your CV is a sales tool, not an application document. Tailoring per client matters — if it doesn&apos;t cost you hours.';
export const keywords = [
  'freelancer CV',
  'consultant CV',
  'contractor CV',
  'CV per project',
  'proposal CV',
];
export const relatedBlogSlugs = [
  'cv-tailored-in-two-minutes',
  'chatgpt-vs-cveetje',
  'cover-letter-without-ai-tells',
];

export function Body() {
  return (
    <>
      <h2>The freelance reality</h2>
      <p>
        An employee CV says &quot;hire me&quot;. A freelance CV says &quot;you get what you pay for&quot;.
        Different goal, different choices — outcomes first, clients named, framing tuned to the
        specific brief.
      </p>

      <h2>What CVeetje does for you</h2>
      <ul>
        <li>
          <strong>One profile, all engagements.</strong> Client, sector, scope, period, your role,
          outcomes. Set up once, then a foundation for every variant.
        </li>
        <li>
          <strong>Per-proposal tailored variant.</strong> Paste the brief, generate. Relevant
          engagements surface first; framing matches what the client wants.
        </li>
        <li>
          <strong>Rate signal through framing.</strong> &quot;Because&quot; and &quot;which led to&quot;
          in bullets — &quot;built dashboard because management was steering blind&quot;. Two words,
          different rate.
        </li>
        <li>
          <strong>Your own template supported.</strong> Have a signature layout? Upload as DOCX. AI
          fills it.
        </li>
      </ul>

      <h2>What a sharp freelance CV typically does</h2>
      <ol>
        <li>
          <strong>Specific positioning at the top.</strong> Not &quot;freelance software engineer&quot;.
          &quot;Freelance software engineer | backend + DevOps for fintech scale-ups&quot;.
        </li>
        <li>
          <strong>Recent engagements in depth.</strong> 3–5 engagements with the problem, your role,
          measurable outcome.
        </li>
        <li>
          <strong>Focus toolset.</strong> Not every tech you&apos;ve touched — the 3–5 you&apos;re
          truly good at now.
        </li>
        <li>
          <strong>Honest limitation.</strong> What you don&apos;t take on anymore. Signals seriousness
          about your craft.
        </li>
      </ol>

      <h2>BYOK is usually right for freelancers</h2>
      <p>
        If you send a tailored CV with every proposal you&apos;ll quickly do 10–30 generations per
        month. On platform credits that costs €15–€40. On BYOK (your own Claude or OpenAI key) it
        costs a few euros in your own API fees plus one credit per download on our side. For active
        proposal work: BYOK.
      </p>
    </>
  );
}

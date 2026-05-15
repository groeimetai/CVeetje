import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'zij-instromers';
export const locale: PersonaPage['locale'] = 'en';
export const title = 'CVeetje for career switchers — a CV that makes your pivot logical';
export const description =
  'For people changing sector or profession. How to build a CV where your &quot;old&quot; experience tells a strong story for your &quot;new&quot; direction.';
export const hero =
  'A linear CV puts old work first. With a few deliberate framing choices, that&apos;s no problem — often an advantage.';
export const keywords = [
  'career switch CV',
  'career changer resume',
  'pivot CV',
  'transferable skills CV',
];
export const relatedBlogSlugs = [
  'cv-tailored-in-two-minutes',
  'cover-letter-without-ai-tells',
  'recruiter-perspective',
];

export function Body() {
  return (
    <>
      <h2>What makes a career-switcher CV unique</h2>
      <p>
        A traditional chronological CV works poorly. Old roles dominate by time and weight; your new
        direction is recent and small. A recruiter sees old work first and forms doubts before reaching
        the new direction. A good switcher CV subtly inverts that.
      </p>

      <h2>The principles</h2>
      <ol>
        <li>
          <strong>Acknowledge the switch in the first two sentences.</strong> Not hiding, not
          excusing. State clearly what you did and where you&apos;re heading.
        </li>
        <li>
          <strong>Proof of new direction up top.</strong> Bootcamp, certifications, personal projects,
          freelance work — what you&apos;ve completed in this direction deserves prominence.
        </li>
        <li>
          <strong>Older roles with transferable framing.</strong> Not hidden, framed differently —
          specifically on what transfers.
        </li>
        <li>
          <strong>One concrete piece of work proving the new direction.</strong> A project, a
          deliverable, a contribution. Something that survives a &quot;what did you build?&quot;
          question.
        </li>
      </ol>

      <h2>How CVeetje helps here</h2>
      <ul>
        <li>
          During profile setup you can flag that you&apos;re in a switch situation — old direction,
          new direction, the bridge between them.
        </li>
        <li>
          That context is sent to every generation. The profile summary consistently acknowledges the
          switch; old roles are framed on their transferable side.
        </li>
        <li>
          The gatekeeper step prevents inflating claims to make the new direction more plausible.
        </li>
        <li>
          Cover letters get a humanizer pass that removes switch-specific clichés.
        </li>
      </ul>

      <h2>Common switches we&apos;ve helped with</h2>
      <ul>
        <li>Teaching → software/data</li>
        <li>Healthcare (nursing, medical) → IT, project management, policy</li>
        <li>Sales → product management or customer success</li>
        <li>HR administration → recruitment or HR business partner</li>
        <li>Retail/hospitality → ops, sales, hospitality management</li>
        <li>Military → security, project management, leadership roles</li>
        <li>Academia → industry (consulting, data science, R&amp;D)</li>
      </ul>

      <h2>The role of your cover letter</h2>
      <p>
        For a career switcher the cover letter often carries more weight. Two elements:
      </p>
      <ol>
        <li>A concrete trigger for the switch (not &quot;I wanted change&quot;).</li>
        <li>
          An honest acknowledgement of where you&apos;re still learning. &quot;I know I can&apos;t
          compete on seniority, but on...&quot; works better than disguise.
        </li>
      </ol>
    </>
  );
}

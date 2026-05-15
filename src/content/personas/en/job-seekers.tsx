import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'werkzoekenden';
export const locale: PersonaPage['locale'] = 'en';
export const title = 'CVeetje for job seekers — faster targeted CVs per application';
export const description =
  'For active job seekers. How to make a targeted CV per role without fighting Word, and how to keep your application from drowning in filters.';
export const hero =
  'Job hunting is work. Reworking your CV in Word every week adds no value — especially when the bar for a strong version is different per ad.';
export const keywords = [
  'job seeker CV',
  'targeted CV',
  'CV per job',
  'fast CV builder',
  'ATS CV',
];
export const relatedBlogSlugs = [
  'cv-tailored-in-two-minutes',
  'ats-cv-2026',
  'recruiter-perspective',
  'cover-letter-without-ai-tells',
];

export function Body() {
  return (
    <>
      <h2>The situation</h2>
      <p>
        You&apos;re job hunting. You&apos;ve saved fifteen ads you find interesting. You know you should
        tailor your CV per role. You also know it&apos;s stupid work to format each one in Word. That&apos;s
        the friction CVeetje removes.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>
          <strong>Profile setup once.</strong> After that, every variant is paste-and-generate.
        </li>
        <li>
          <strong>Targeted CV per job.</strong> No invention — reordering and reframing of what
          you&apos;ve actually done, with the right words for the specific role.
        </li>
        <li>
          <strong>Cover letter on demand.</strong> Optional. Second humanizer pass to remove the
          standard AI tone.
        </li>
        <li>
          <strong>Five styles.</strong> Conservative for bank and healthcare; Creative for design and
          marketing; Editorial for portfolio roles. Style flexes to the employer.
        </li>
        <li>
          <strong>ATS-friendly.</strong> Compatible with what 90% of European employers run.
        </li>
      </ul>

      <h2>Who it fits best</h2>
      <p>
        Active job seekers. A few applications per week, possibly more. Less relevant if you only
        apply once every three years.
      </p>
      <p>
        Extra useful if:
      </p>
      <ul>
        <li>You&apos;re exploring multiple directions, not one role type.</li>
        <li>
          You have several years of experience and your CV runs longer than one page.
        </li>
        <li>
          You&apos;re in a career switch or have something to explain (see also our career-switcher
          guide).
        </li>
      </ul>

      <h2>The practical flow</h2>
      <ol>
        <li>Sign up (free, 15 credits/month).</li>
        <li>Profile setup — from a LinkedIn PDF, manual entry, or an existing CV.</li>
        <li>Paste first job ad, pick style, generate.</li>
        <li>Read, finetune, download PDF.</li>
        <li>Next ad: another minute.</li>
      </ol>

      <h2>What it does not do</h2>
      <p>
        Doesn&apos;t apply for you. Doesn&apos;t auto-edit your network. Doesn&apos;t invent
        experience. It&apos;s a tool for writing tasks — where you apply, what to ask for in salary,
        who to approach: those stay with you.
      </p>

      <h2>Honest caveats</h2>
      <ul>
        <li>
          A generated CV deserves a real read. Don&apos;t blind-send. Ten minutes of read + finetune.
        </li>
        <li>
          The free tier (1 CV per month) covers occasional application work. Heavier use costs a few
          euros per pack.
        </li>
      </ul>
    </>
  );
}

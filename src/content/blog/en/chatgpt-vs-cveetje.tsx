import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'chatgpt-vs-cveetje',
  locale: 'en',
  title: 'ChatGPT vs CVeetje — when is a dedicated tool worth it?',
  description:
    'ChatGPT, Claude, and Gemini all make CVs. So why a separate tool? An honest comparison without sales fluff.',
  publishedAt: '2026-04-10',
  updatedAt: '2026-05-15',
  readingMinutes: 8,
  category: 'comparison',
  personas: ['werkzoekenden', 'product-owners', 'zzp'],
  keywords: ['ChatGPT CV', 'Claude CV', 'AI CV generator', 'CV builder comparison'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Before we built CVeetje, we used ChatGPT for our own CVs. It worked. It worked pretty well. So
        why build a separate tool? Four specific reasons — and one honest reason to stick with ChatGPT.
      </p>

      <h2>What ChatGPT does well</h2>
      <ul>
        <li>
          <strong>Rewriting text.</strong> Paste your old CV, paste the job, ask for a tailored version
          — you get something usable.
        </li>
        <li>
          <strong>Brainstorming framing.</strong> &quot;My role was X, I achieved Y — what&apos;s that
          called in management speak?&quot; is an excellent ChatGPT prompt.
        </li>
        <li>
          <strong>Cover letter drafts.</strong> Three versions, pick the best, polish. Every generic
          chatbot does this fine.
        </li>
      </ul>
      <p>
        If you apply once a year, a dedicated tool isn&apos;t worth it. If you apply six times a month,
        or build CVs for a team, or work with different clients in different sectors each month, the
        friction starts to bite.
      </p>

      <h2>Where ChatGPT starts to grind</h2>

      <h3>1. Your profile lives nowhere</h3>
      <p>
        Every new chat starts blank. You paste your work history again, your certs again, that one role
        from 2019 you always forget. Custom GPTs and projects help but don&apos;t enforce structure —
        the next time, the model phrases the same role slightly differently. Not wrong, but
        inconsistent. And consistency is what a CV needs, especially if a recruiter sees two from you.
      </p>
      <p>
        CVeetje stores your profile as a structured data model. Each role, skill, education is a field.
        The AI fills it. On regeneration the factual layer stays identical — only framing changes.
      </p>

      <h3>2. Layout in ChatGPT is a chore</h3>
      <p>
        You get plain text or Markdown. For a real CV you pour it into Word or Docs, fight layout, pick
        fonts, align columns. Your &quot;quick ChatGPT CV&quot; is still thirty minutes of work.
      </p>
      <p>
        A tool that produces text <em>and</em> PDF in one pass isn&apos;t a luxury — it&apos;s where the
        time lives. CVeetje renders five styles from the same data model.
      </p>

      <h3>3. AI tells in cover letters</h3>
      <p>
        Ask any LLM for a cover letter and you get: &quot;With great enthusiasm, I am applying for the
        position of...&quot; Every recruiter recognises this now. Not harmful — just unmemorable.
      </p>
      <p>
        CVeetje runs every cover letter through a second humanizer pass. The prompt actively looks for
        AI tells (Wikipedia&apos;s &quot;signs of AI writing&quot; list is the source) and rewrites
        them to something a person would type on a Tuesday evening.
      </p>

      <h3>4. Honesty checks</h3>
      <p>
        LLMs are helpful by nature. Ask &quot;make my CV stronger&quot; and it will, without
        malicious intent, inflate a claim. &quot;Helped the marketing team&quot; becomes &quot;led
        marketing strategy&quot;. CVeetje&apos;s prompts explicitly forbid this and a gatekeeper step
        checks whether revisions have honest grounds. Not security theatre — what keeps a CV usable
        across multiple applications without stumbling in an interview.
      </p>

      <h2>The honest part: when to stick with ChatGPT</h2>
      <p>
        Apply twice a year, technically comfortable, find Word fine? Open ChatGPT, prompt well,
        copy-paste into a template, done. You don&apos;t need CVeetje. It would be dishonest to claim
        otherwise.
      </p>
      <p>
        The tipping point is roughly here:
      </p>
      <ul>
        <li>You apply more than two or three times a month.</li>
        <li>You work as a career coach or recruiter, making CVs for others.</li>
        <li>You&apos;re a freelancer sending tailored CVs with each proposal.</li>
        <li>
          You&apos;re a hiring manager or PO and want consistent material to send to clients or
          partners.
        </li>
        <li>
          You find re-pasting the same context tedious, or care that your profile stays in one place
          instead of scattered across chats.
        </li>
      </ul>

      <h2>The comparison in one table</h2>
      <table>
        <thead>
          <tr>
            <th>Aspect</th>
            <th>ChatGPT (Plus)</th>
            <th>CVeetje</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Profile as data model</td>
            <td>Custom GPT, limited</td>
            <td>Structured, reusable</td>
          </tr>
          <tr>
            <td>PDF output with layout</td>
            <td>No — manual work</td>
            <td>5 styles, ready</td>
          </tr>
          <tr>
            <td>ATS-friendly PDF</td>
            <td>Depends on Word work</td>
            <td>Built in</td>
          </tr>
          <tr>
            <td>Cover letter without AI tells</td>
            <td>Decent with good prompts</td>
            <td>Second humanizer pass</td>
          </tr>
          <tr>
            <td>Honesty checks</td>
            <td>None specific</td>
            <td>Gatekeeper on revisions</td>
          </tr>
          <tr>
            <td>Filling your own DOCX template</td>
            <td>Impractical</td>
            <td>Upload + AI fills</td>
          </tr>
          <tr>
            <td>Monthly cost</td>
            <td>€22 (Plus)</td>
            <td>€0 for 1 CV / €4.99 for 30 credits</td>
          </tr>
          <tr>
            <td>Use your own API key</td>
            <td>n/a</td>
            <td>Yes — BYOK, 0 platform credits</td>
          </tr>
        </tbody>
      </table>

      <h2>One thing ChatGPT does better</h2>
      <p>
        Open conversation. If you&apos;re not sure whether to apply, unclear which direction fits, or
        wondering what job title makes sense — open chat is perfect for that. Brainstorm in ChatGPT,
        bring the result to CVeetje once you know where you&apos;re heading. Two tools, two phases.
      </p>
    </>
  );
}

/**
 * Directe API-calls naar de app met het ID-token van een testgebruiker.
 * Gebruikt om snel state op te bouwen (een gegenereerd CV) zonder de hele
 * wizard door te klikken.
 */
import { BASE_URL } from '../env';
import type { TestUser } from './emulator';

export const SAMPLE_PROFILE = {
  fullName: 'Sanne de Vries',
  headline: 'Senior Frontend Developer',
  location: 'Utrecht, Nederland',
  about: 'Ervaren frontend developer met acht jaar ervaring in React en TypeScript.',
  email: 'sanne.devries@example.com',
  experience: [
    {
      title: 'Senior Frontend Developer',
      company: 'Acme BV',
      location: 'Utrecht',
      startDate: '2020-01',
      endDate: null,
      description: 'Bouwde de klantportal in React en TypeScript.',
      isCurrentRole: true,
    },
  ],
  education: [{ school: 'Universiteit Utrecht', degree: 'MSc', fieldOfStudy: 'Informatica', startYear: '2015', endYear: '2019' }],
  skills: [{ name: 'React' }, { name: 'TypeScript' }],
  languages: [{ language: 'Nederlands', proficiency: 'Moedertaal' }],
  certifications: [],
  projects: [],
};

export const SAMPLE_VACANCY = {
  title: 'Senior Frontend Developer',
  company: 'Acme BV',
  location: 'Utrecht',
  description: 'Wij zoeken een Senior Frontend Developer met ervaring in React en TypeScript.',
  requirements: ['React', 'TypeScript'],
  keywords: ['React', 'TypeScript'],
  industry: 'IT',
};

export async function api(user: TestUser, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${user.idToken}`);
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

/** Genereer stijl-tokens via /api/cv/style (SSE) met de mock-AI. */
export async function generateStyleTokens(user: TestUser): Promise<Record<string, unknown>> {
  const res = await api(user, '/api/cv/style', {
    method: 'POST',
    body: JSON.stringify({ linkedInData: SAMPLE_PROFILE, jobVacancy: SAMPLE_VACANCY, creativityLevel: 'balanced' }),
  });
  const text = await res.text();
  // Zonder `Accept: text/event-stream` antwoordt de route met gewone JSON
  if (text.trimStart().startsWith('{')) {
    const json = JSON.parse(text);
    if (json.tokens) return json.tokens;
    throw new Error(`style: ${res.status} ${json.error}`);
  }
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const evt = JSON.parse(line.slice(6));
    if (evt.type === 'complete') return evt.tokens;
    if (evt.type === 'error') throw new Error(`style: ${evt.error}`);
  }
  throw new Error(`style: no complete event (${res.status}): ${text.slice(0, 500)}`);
}

/** Maak een volledig gegenereerd CV (stijl + content) en geef het id terug. */
export async function seedGeneratedCv(user: TestUser): Promise<string> {
  const designTokens = await generateStyleTokens(user);
  const res = await api(user, '/api/cv/generate', {
    method: 'POST',
    body: JSON.stringify({ linkedInData: SAMPLE_PROFILE, jobVacancy: SAMPLE_VACANCY, designTokens, language: 'nl' }),
  });
  const json = (await res.json()) as { cvId?: string; error?: string };
  if (!res.ok || !json.cvId) throw new Error(`generate: ${res.status} ${json.error}`);
  return json.cvId;
}

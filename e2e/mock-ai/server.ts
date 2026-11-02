/**
 * Mock van de Anthropic Messages API voor E2E-tests.
 *
 * De app praat via `@ai-sdk/anthropic` met deze server doordat de e2e-env
 * `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>/v1` zet. Ondersteunt:
 * - structured output via `output_config.format` (json_schema) → text-block met JSON
 * - structured output via een `json`-tool → tool_use-block
 * - vrije tekst (generateText) en streaming (SSE, voor de CV-chat)
 *
 * Antwoorden worden gegenereerd uit het meegestuurde JSON-schema (generieke
 * faker) met realistische overrides per operatie, herkend aan de
 * property-namen van het schema. Requests worden gelogd en zijn op te vragen
 * via `GET /__requests` (en te resetten via `DELETE /__requests`).
 */
import http from 'node:http';

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  const?: unknown;
  default?: unknown;
};

// ---------------------------------------------------------------------------
// Realistische fixture-waarden per veldnaam
// ---------------------------------------------------------------------------

const PROFILE = {
  fullName: 'Sanne de Vries',
  firstName: 'Sanne',
  lastName: 'de Vries',
  email: 'sanne.devries@example.com',
  phone: '+31 6 12345678',
  location: 'Utrecht, Nederland',
  headline: 'Senior Frontend Developer',
};

const STRING_HINTS: Record<string, string> = {
  ...PROFILE,
  title: 'Senior Frontend Developer',
  company: 'Acme BV',
  companyName: 'Acme BV',
  institution: 'Universiteit Utrecht',
  school: 'Universiteit Utrecht',
  degree: 'MSc Informatica',
  fieldOfStudy: 'Informatica',
  period: 'januari 2020 - heden',
  startDate: '2020-01',
  endDate: '2023-06',
  year: '2019',
  startYear: '2015',
  endYear: '2019',
  language: 'Nederlands',
  level: 'Moedertaal',
  proficiency: 'Moedertaal',
  name: 'TypeScript',
  url: 'https://example.com',
  industry: 'IT',
  verdict: 'good',
  summary:
    'Ervaren frontend developer met acht jaar ervaring in React en TypeScript, gericht op toegankelijke en snelle webapplicaties.',
  about:
    'Ervaren frontend developer met acht jaar ervaring in React en TypeScript, gericht op toegankelijke en snelle webapplicaties.',
  description:
    'Bouwde en onderhield de klantportal in React en TypeScript voor ruim 50.000 gebruikers, samen met een team van zes developers.',
  opening:
    'Met veel enthousiasme reageer ik op de vacature voor Senior Frontend Developer bij Acme BV, die ik op jullie website zag.',
  whyCompany:
    'Acme BV bouwt producten die dagelijks door duizenden mensen gebruikt worden, en die focus op gebruikers spreekt mij aan.',
  whyMe:
    'In mijn huidige rol bouw ik al jaren React-applicaties met TypeScript en zorg ik voor toegankelijkheid en performance.',
  motivation:
    'Ik wil graag bijdragen aan een team dat kwaliteit en gebruiksvriendelijkheid hoog in het vaandel heeft staan.',
  closing:
    'Ik vertel graag in een persoonlijk gesprek meer over wat ik voor jullie team kan betekenen. Met vriendelijke groet.',
  rationale: 'De gebruiker geeft een duidelijke en onderbouwde reden voor een ander stijlniveau.',
  advice: 'Benadruk je ervaring met React en TypeScript en noem concrete projecten.',
};

function hintFor(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (STRING_HINTS[key]) return STRING_HINTS[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(STRING_HINTS)) {
    if (lower.endsWith(k.toLowerCase())) return v;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Generieke JSON-schema faker
// ---------------------------------------------------------------------------

function pickType(schema: JsonSchema): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== 'null') ?? schema.type[0];
  return schema.type;
}

export function fake(schema: JsonSchema | undefined, key?: string, depth = 0): unknown {
  if (!schema || depth > 8) return null;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants && variants.length > 0) {
    const nonNull = variants.find((v) => pickType(v) !== 'null') ?? variants[0];
    return fake(nonNull, key, depth);
  }
  const type = pickType(schema) ?? (schema.properties ? 'object' : schema.items ? 'array' : 'string');
  switch (type) {
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema.properties ?? {})) {
        out[k] = fake(v, k, depth + 1);
      }
      return out;
    }
    case 'array': {
      const min = schema.minItems ?? 0;
      const max = schema.maxItems ?? 3;
      const n = Math.max(min, Math.min(3, max));
      return Array.from({ length: n }, (_, i) => {
        const item = fake(schema.items, key, depth + 1);
        return typeof item === 'string' && n > 1 ? `${item}${i ? ` (${i + 1})` : ''}` : item;
      });
    }
    case 'number':
    case 'integer': {
      const lo = schema.minimum ?? 0;
      const hi = schema.maximum ?? 100;
      const mid = lo + (hi - lo) * 0.75;
      return type === 'integer' ? Math.round(mid) : mid;
    }
    case 'boolean':
      return true;
    case 'null':
      return null;
    default: {
      let s = hintFor(key) ?? `Mock-waarde voor ${key ?? 'veld'} met voldoende lengte voor validatie.`;
      if (schema.maxLength && s.length > schema.maxLength) s = s.slice(0, schema.maxLength);
      if (schema.minLength && s.length < schema.minLength) s = s.padEnd(schema.minLength, '.');
      return s;
    }
  }
}

// ---------------------------------------------------------------------------
// Operatie-specifieke overrides (herkend aan property-namen)
// ---------------------------------------------------------------------------

function propKeys(schema: JsonSchema | undefined): Set<string> {
  return new Set(Object.keys(schema?.properties ?? {}));
}

function override(schema: JsonSchema, value: Record<string, unknown>): Record<string, unknown> {
  const keys = propKeys(schema);

  // CV-content (cv-generator)
  if (keys.has('experience') && keys.has('skills') && keys.has('headline')) {
    return {
      ...value,
      headline: 'Senior Frontend Developer',
      summary: STRING_HINTS.summary,
      experience: [
        {
          title: 'Senior Frontend Developer',
          company: 'Acme BV',
          location: 'Utrecht',
          period: 'januari 2020 - heden',
          highlights: [
            'Bouwde de klantportal in React en TypeScript.',
            'Verbeterde de toegankelijkheid van de webapplicatie.',
          ],
          relevanceScore: 5,
        },
      ],
      education: [{ degree: 'MSc Informatica', institution: 'Universiteit Utrecht', year: '2019', details: null }],
      skills: { technical: ['React', 'TypeScript'], soft: ['Samenwerken'] },
      languages: [{ language: 'Nederlands', level: 'Moedertaal' }],
      certifications: [],
      projects: [],
      interests: [],
    };
  }

  // Profiel-parse
  if (keys.has('fullName') && keys.has('experience')) {
    return {
      ...value,
      ...PROFILE,
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
    };
  }

  // Fit-analyse
  if (keys.has('overallScore') && keys.has('verdict')) {
    return { ...value, overallScore: 78, verdict: 'good' };
  }

  // Dispute-gatekeeper
  if (keys.has('verdict') && keys.has('rationale') && !keys.has('overallScore')) {
    return { ...value, verdict: 'approved' };
  }

  // Vacature-parse
  if (keys.has('keywords') && keys.has('title') && (keys.has('company') || keys.has('requirements'))) {
    return {
      ...value,
      title: 'Senior Frontend Developer',
      company: 'Acme BV',
      location: 'Utrecht',
      description: 'Wij zoeken een Senior Frontend Developer met ervaring in React en TypeScript.',
      keywords: ['React', 'TypeScript', 'toegankelijkheid'],
    };
  }

  // Stijl (v2 orchestrator): laat de app zelf een geldig recept kiezen
  // Alleen het verplichte veld; de app valt terug op het best passende recept
  // en de defaults van dat recept (optionele overrides weglaten).
  if (keys.has('recipeId')) {
    return { recipeId: '__mock__' };
  }

  return value;
}

export function answerForSchema(schema: JsonSchema): unknown {
  const base = fake(schema);
  if (base && typeof base === 'object' && !Array.isArray(base)) {
    return override(schema, base as Record<string, unknown>);
  }
  return base;
}

// ---------------------------------------------------------------------------
// HTTP-server
// ---------------------------------------------------------------------------

interface LoggedRequest {
  at: string;
  model: string;
  stream: boolean;
  mode: 'output_config' | 'json_tool' | 'text';
  schemaKeys: string[];
  system: string;
}

const requests: LoggedRequest[] = [];

const usage = { input_tokens: 100, output_tokens: 50 };

function textResponse(model: string, text: string) {
  return {
    id: `msg_mock_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage,
  };
}

function sseText(res: http.ServerResponse, model: string, text: string) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('message_start', {
    type: 'message_start',
    message: { id: `msg_mock_${Date.now()}`, type: 'message', role: 'assistant', model, content: [], stop_reason: null, usage },
  });
  send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
  for (const chunk of text.match(/.{1,24}/g) ?? [text]) {
    send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunk } });
  }
  send('content_block_stop', { type: 'content_block_stop', index: 0 });
  send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 50 } });
  send('message_stop', { type: 'message_stop' });
  res.end();
}

function systemText(body: Record<string, unknown>): string {
  const sys = body.system;
  if (typeof sys === 'string') return sys;
  if (Array.isArray(sys)) return sys.map((b) => (b as { text?: string }).text ?? '').join('\n');
  return '';
}

const RECONSTRUCT_HTML =
  '<main class="p-8"><h1 class="text-2xl font-bold">Sanne de Vries</h1><p>Senior Frontend Developer</p></main>';

function handleMessages(body: Record<string, unknown>, res: http.ServerResponse) {
  const model = String(body.model ?? 'claude-mock');
  const stream = body.stream === true;
  const outputSchema = (body.output_config as { format?: { schema?: JsonSchema } } | undefined)?.format?.schema;
  const tools = (body.tools as Array<{ name: string; input_schema?: JsonSchema }> | undefined) ?? [];
  const jsonTool = tools.find((t) => t.name === 'json');
  const system = systemText(body);

  const mode: LoggedRequest['mode'] = outputSchema ? 'output_config' : jsonTool ? 'json_tool' : 'text';
  requests.push({
    at: new Date().toISOString(),
    model,
    stream,
    mode,
    schemaKeys: Object.keys((outputSchema ?? jsonTool?.input_schema)?.properties ?? {}),
    system: system.slice(0, 200),
  });

  if (outputSchema) {
    const text = JSON.stringify(answerForSchema(outputSchema));
    if (stream) return sseText(res, model, text);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(textResponse(model, text)));
  }

  if (jsonTool) {
    const input = answerForSchema(jsonTool.input_schema ?? {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        id: `msg_mock_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model,
        content: [{ type: 'tool_use', id: `toolu_mock_${Date.now()}`, name: 'json', input }],
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage,
      }),
    );
  }

  const isReconstruct = /<main|Tailwind/i.test(system) || /<main/i.test(JSON.stringify(body.messages ?? '').slice(0, 5000));
  const text = isReconstruct
    ? RECONSTRUCT_HTML
    : 'Ik heb je samenvatting aangescherpt zodat je ervaring met React en TypeScript beter naar voren komt.';
  if (stream) return sseText(res, model, text);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(textResponse(model, text)));
}

export function startMockAiServer(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/__requests')) {
      if (req.method === 'DELETE') requests.length = 0;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(requests));
    }
    if (req.method === 'POST' && req.url?.endsWith('/messages')) {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          handleMessages(JSON.parse(raw || '{}'), res);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: String(err) } }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const port = Number(process.env.MOCK_AI_PORT || 4010);
  startMockAiServer(port).then(() => console.log(`[mock-ai] listening on http://127.0.0.1:${port}/v1`));
}

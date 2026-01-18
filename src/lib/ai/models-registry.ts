/**
 * Dynamic AI Models Registry
 * Fetches model data from models.dev (sst/models.dev GitHub repo)
 */

import type { InputModality } from '@/types';

export interface ModelInfo {
  id: string;
  name: string;
  family: string;
  provider: string;
  providerId: string;
  capabilities: {
    toolCall: boolean;
    reasoning: boolean;
    structuredOutput: boolean;
  };
  pricing: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
    cacheRead?: number;
  };
  limits: {
    context: number;
    output: number;
  };
  modalities?: {
    input: string[];
    output: string[];
  };
  releaseDate?: string;
  lastUpdated?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}

// Supported providers for CV generation (need structured output support)
const SUPPORTED_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'google',
  'google-vertex',
  'azure',
  'groq',
  'mistral',
  'cohere',
  'deepseek',
  'fireworks',
  'together',
] as const;

export type SupportedProviderId = typeof SUPPORTED_PROVIDER_IDS[number];

// GitHub raw content base URL for models.dev (repo moved from sst to anomalyco)
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/anomalyco/models.dev/dev';

// GitHub API headers (with optional authentication for higher rate limits)
function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  // Add auth token if available (increases rate limit from 60 to 5000/hour)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Cache for fetched data
let modelsCache: Map<string, ProviderInfo> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Parse TOML content (simple parser for model files)
 */
function parseTOML(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = '';

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section header
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = {};
      continue;
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^([^=]+)=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value: unknown = kvMatch[2].trim();

      // Parse value type
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^-?[\d_]+\.?[\d_]*$/.test(value as string)) {
        // Handle underscore separators in numbers (e.g., 128_000)
        const numStr = (value as string).replace(/_/g, '');
        const parsed = parseFloat(numStr);
        value = isNaN(parsed) ? 0 : parsed;
      }
      else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
        value = (value as string).slice(1, -1);
      }
      else if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
        // Simple array parsing
        const arrayContent = (value as string).slice(1, -1);
        value = arrayContent.split(',').map(v => {
          const trimmedV = v.trim();
          if (trimmedV.startsWith('"') && trimmedV.endsWith('"')) {
            return trimmedV.slice(1, -1);
          }
          return trimmedV;
        }).filter(Boolean);
      }

      if (currentSection) {
        (result[currentSection] as Record<string, unknown>)[key] = value;
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Fetch provider info from GitHub
 */
async function fetchProviderInfo(providerId: string): Promise<ProviderInfo | null> {
  try {
    // Fetch provider.toml
    const providerRes = await fetch(`${GITHUB_RAW_BASE}/providers/${providerId}/provider.toml`);
    if (!providerRes.ok) return null;

    const providerToml = await providerRes.text();
    const providerData = parseTOML(providerToml);

    // Fetch model list from GitHub API (repo moved from sst to anomalyco)
    const modelsListRes = await fetch(
      `https://api.github.com/repos/anomalyco/models.dev/contents/providers/${providerId}/models?ref=dev`,
      { headers: getGitHubHeaders() }
    );
    if (!modelsListRes.ok) return null;

    const modelFiles = await modelsListRes.json() as Array<{ name: string }>;

    // Fetch each model
    const models: ModelInfo[] = [];

    // Limit concurrent requests
    const tomlFiles = modelFiles.filter(f => f.name.endsWith('.toml'));

    // Fetch models in batches of 5 (fetch up to 50 models per provider)
    for (let i = 0; i < Math.min(tomlFiles.length, 50); i += 5) {
      const batch = tomlFiles.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const modelRes = await fetch(
              `${GITHUB_RAW_BASE}/providers/${providerId}/models/${file.name}`
            );
            if (!modelRes.ok) return null;

            const modelToml = await modelRes.text();
            const modelData = parseTOML(modelToml);

            const modelId = file.name.replace('.toml', '');
            const cost = modelData.cost as Record<string, number> | undefined;
            const limit = modelData.limit as Record<string, number> | undefined;
            const modalities = modelData.modalities as Record<string, string[]> | undefined;

            // Skip embedding models (they don't generate text)
            const modelName = (modelData.name as string || modelId).toLowerCase();
            if (modelName.includes('embed') || modelName.includes('embedding')) return null;

            // Check output modalities - skip if it doesn't output text
            if (modalities?.output && !modalities.output.includes('text')) return null;

            // Most modern chat models support structured output via tool_call
            const hasStructuredOutput = !!(modelData.tool_call || modelData.structured_output || modelData.json_mode);

            return {
              id: modelId,
              name: modelData.name as string || modelId,
              family: modelData.family as string || '',
              provider: providerData.name as string || providerId,
              providerId,
              capabilities: {
                toolCall: !!modelData.tool_call,
                reasoning: !!modelData.reasoning,
                structuredOutput: hasStructuredOutput,
              },
              pricing: {
                input: cost?.input || 0,
                output: cost?.output || 0,
                cacheRead: cost?.cache_read,
              },
              limits: {
                context: limit?.context || 0,
                output: limit?.output || 0,
              },
              modalities: modalities ? {
                input: modalities.input || ['text'],
                output: modalities.output || ['text'],
              } : undefined,
              releaseDate: modelData.release_date as string,
              lastUpdated: modelData.last_updated as string,
            } as ModelInfo;
          } catch {
            return null;
          }
        })
      );

      models.push(...batchResults.filter((m): m is ModelInfo => m !== null));
    }

    return {
      id: providerId,
      name: providerData.name as string || providerId,
      models: models.sort((a, b) => {
        // Sort by last updated, then by name
        if (a.lastUpdated && b.lastUpdated) {
          return b.lastUpdated.localeCompare(a.lastUpdated);
        }
        return a.name.localeCompare(b.name);
      }),
    };
  } catch (error) {
    console.error(`Failed to fetch provider ${providerId}:`, error);
    return null;
  }
}

/**
 * Get all supported providers with their models
 */
export async function getProviders(): Promise<ProviderInfo[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (modelsCache && now - lastFetchTime < CACHE_DURATION) {
    return Array.from(modelsCache.values());
  }

  // Fetch all providers in parallel
  const results = await Promise.all(
    SUPPORTED_PROVIDER_IDS.map(id => fetchProviderInfo(id))
  );

  // Update cache
  modelsCache = new Map();
  for (const provider of results) {
    if (provider && provider.models.length > 0) {
      modelsCache.set(provider.id, provider);
    }
  }
  lastFetchTime = now;

  return Array.from(modelsCache.values());
}

/**
 * Get models for a specific provider
 */
export async function getProviderModels(providerId: string): Promise<ModelInfo[]> {
  const providers = await getProviders();
  const provider = providers.find(p => p.id === providerId);
  return provider?.models || [];
}

/**
 * Get a specific model by provider and model ID
 */
export async function getModel(providerId: string, modelId: string): Promise<ModelInfo | null> {
  const models = await getProviderModels(providerId);
  return models.find(m => m.id === modelId) || null;
}

/**
 * Fallback static models in case API fetch fails
 */
export const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        family: 'gpt',
        provider: 'OpenAI',
        providerId: 'openai',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 2.5, output: 10 },
        limits: { context: 128000, output: 16384 },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        family: 'gpt',
        provider: 'OpenAI',
        providerId: 'openai',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.15, output: 0.6 },
        limits: { context: 128000, output: 16384 },
      },
      {
        id: 'o1',
        name: 'o1',
        family: 'o1',
        provider: 'OpenAI',
        providerId: 'openai',
        capabilities: { toolCall: true, reasoning: true, structuredOutput: true },
        pricing: { input: 15, output: 60 },
        limits: { context: 200000, output: 100000 },
      },
      {
        id: 'o1-mini',
        name: 'o1 Mini',
        family: 'o1',
        provider: 'OpenAI',
        providerId: 'openai',
        capabilities: { toolCall: true, reasoning: true, structuredOutput: true },
        pricing: { input: 3, output: 12 },
        limits: { context: 128000, output: 65536 },
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        family: 'claude',
        provider: 'Anthropic',
        providerId: 'anthropic',
        capabilities: { toolCall: true, reasoning: true, structuredOutput: true },
        pricing: { input: 3, output: 15 },
        limits: { context: 200000, output: 64000 },
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        family: 'claude',
        provider: 'Anthropic',
        providerId: 'anthropic',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 3, output: 15 },
        limits: { context: 200000, output: 8192 },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        family: 'claude',
        provider: 'Anthropic',
        providerId: 'anthropic',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 1, output: 5 },
        limits: { context: 200000, output: 8192 },
      },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        family: 'gemini',
        provider: 'Google',
        providerId: 'google',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.1, output: 0.4 },
        limits: { context: 1000000, output: 8192 },
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        family: 'gemini',
        provider: 'Google',
        providerId: 'google',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 1.25, output: 5 },
        limits: { context: 2000000, output: 8192 },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        family: 'gemini',
        provider: 'Google',
        providerId: 'google',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.075, output: 0.3 },
        limits: { context: 1000000, output: 8192 },
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        family: 'llama',
        provider: 'Groq',
        providerId: 'groq',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.59, output: 0.79 },
        limits: { context: 128000, output: 32768 },
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        family: 'llama',
        provider: 'Groq',
        providerId: 'groq',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.05, output: 0.08 },
        limits: { context: 128000, output: 8192 },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        family: 'mixtral',
        provider: 'Groq',
        providerId: 'groq',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.24, output: 0.24 },
        limits: { context: 32768, output: 4096 },
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        family: 'mistral',
        provider: 'Mistral',
        providerId: 'mistral',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 2, output: 6 },
        limits: { context: 128000, output: 8192 },
      },
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        family: 'mistral',
        provider: 'Mistral',
        providerId: 'mistral',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.2, output: 0.6 },
        limits: { context: 32000, output: 8192 },
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        family: 'deepseek',
        provider: 'DeepSeek',
        providerId: 'deepseek',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.27, output: 1.1 },
        limits: { context: 64000, output: 8192 },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        family: 'deepseek',
        provider: 'DeepSeek',
        providerId: 'deepseek',
        capabilities: { toolCall: false, reasoning: true, structuredOutput: true },
        pricing: { input: 0.55, output: 2.19 },
        limits: { context: 64000, output: 8192 },
      },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B Turbo',
        family: 'llama',
        provider: 'Together AI',
        providerId: 'together',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.88, output: 0.88 },
        limits: { context: 128000, output: 8192 },
      },
      {
        id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
        name: 'Qwen 2.5 72B Turbo',
        family: 'qwen',
        provider: 'Together AI',
        providerId: 'together',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 1.2, output: 1.2 },
        limits: { context: 32768, output: 8192 },
      },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    models: [
      {
        id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        name: 'Llama 3.3 70B',
        family: 'llama',
        provider: 'Fireworks',
        providerId: 'fireworks',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.9, output: 0.9 },
        limits: { context: 128000, output: 8192 },
      },
      {
        id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
        name: 'Qwen 2.5 72B',
        family: 'qwen',
        provider: 'Fireworks',
        providerId: 'fireworks',
        capabilities: { toolCall: true, reasoning: false, structuredOutput: true },
        pricing: { input: 0.9, output: 0.9 },
        limits: { context: 32768, output: 8192 },
      },
    ],
  },
];

/**
 * Get providers with fallback - merges fetched providers with fallback for missing ones
 * Always includes fallback providers, enriched with fetched data when available
 */
export async function getProvidersWithFallback(): Promise<ProviderInfo[]> {
  // Start with fallback providers as the base (always reliable)
  const providerMap = new Map<string, ProviderInfo>();

  // Add all fallback providers first
  for (const fallbackProvider of FALLBACK_PROVIDERS) {
    providerMap.set(fallbackProvider.id, fallbackProvider);
  }

  // Try to fetch additional/updated data from models.dev
  try {
    const fetchedProviders = await getProviders();

    // Merge fetched providers - only replace if we got meaningful data
    for (const provider of fetchedProviders) {
      if (provider.models.length >= 2) {
        // Only use fetched data if we got at least 2 models (indicates successful fetch)
        providerMap.set(provider.id, provider);
      }
    }
  } catch (error) {
    console.error('Failed to fetch providers from models.dev, using fallback only:', error);
    // Continue with fallback providers
  }

  // Return providers in a consistent order
  const orderedIds = ['openai', 'anthropic', 'google', 'groq', 'mistral', 'deepseek', 'together', 'fireworks', 'google-vertex', 'azure', 'cohere'];
  const result: ProviderInfo[] = [];

  for (const id of orderedIds) {
    const provider = providerMap.get(id);
    if (provider) {
      result.push(provider);
      providerMap.delete(id);
    }
  }

  // Add any remaining providers not in the ordered list
  result.push(...Array.from(providerMap.values()));

  return result;
}

/**
 * Get input modalities for a specific model
 * Returns the modalities supported by the model for input
 */
export function getModelInputModalities(model: ModelInfo): InputModality[] {
  if (!model.modalities?.input) {
    // Default to text only
    return ['text'];
  }

  const modalities: InputModality[] = [];

  for (const m of model.modalities.input) {
    if (m === 'text') modalities.push('text');
    else if (m === 'image') modalities.push('image');
    else if (m === 'pdf') modalities.push('pdf');
  }

  // Always include text as a fallback
  if (!modalities.includes('text')) {
    modalities.unshift('text');
  }

  return modalities;
}

/**
 * Check if a model supports file input (image or PDF)
 */
export function supportsFileInput(model: ModelInfo): boolean {
  const modalities = getModelInputModalities(model);
  return modalities.includes('image') || modalities.includes('pdf');
}

/**
 * Get model info by provider and model ID from providers list
 */
export function findModelInProviders(
  providers: ProviderInfo[],
  providerId: string,
  modelId: string
): ModelInfo | null {
  const provider = providers.find(p => p.id === providerId);
  if (!provider) return null;

  return provider.models.find(m => m.id === modelId) || null;
}

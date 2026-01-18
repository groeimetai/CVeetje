import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type LLMProvider = string; // Now supports any provider from models.dev

// Provider factory functions
const providerFactories: Record<string, (apiKey: string) => ReturnType<typeof createOpenAI>> = {
  openai: (apiKey) => createOpenAI({ apiKey }),
  anthropic: (apiKey) => createAnthropic({ apiKey }) as unknown as ReturnType<typeof createOpenAI>,
  google: (apiKey) => createGoogleGenerativeAI({ apiKey }) as unknown as ReturnType<typeof createOpenAI>,
  'google-vertex': (apiKey) => createGoogleGenerativeAI({ apiKey }) as unknown as ReturnType<typeof createOpenAI>,
};

// OpenAI-compatible providers (use OpenAI SDK with custom baseURL)
const openaiCompatibleProviders: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  together: 'https://api.together.xyz/v1',
  'azure': 'https://models.inference.ai.azure.com',
};

export function createAIProvider(providerId: string, apiKey: string) {
  // Check if we have a native factory
  if (providerFactories[providerId]) {
    return providerFactories[providerId](apiKey);
  }

  // Check if it's an OpenAI-compatible provider
  if (openaiCompatibleProviders[providerId]) {
    return createOpenAI({
      apiKey,
      baseURL: openaiCompatibleProviders[providerId],
    });
  }

  // Default to OpenAI-compatible with custom base URL
  // This allows users to add any OpenAI-compatible provider
  throw new Error(`Provider "${providerId}" is not yet supported. Supported providers: ${Object.keys(providerFactories).concat(Object.keys(openaiCompatibleProviders)).join(', ')}`);
}

export function getModelId(providerId: string, modelName: string): string {
  // Most providers use the model ID directly
  return modelName;
}

// Legacy static models (kept for backward compatibility)
export const AVAILABLE_MODELS: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
};

/**
 * Some Anthropic models (Claude Opus 4.7 and newer) have deprecated the
 * `temperature` parameter — calling them with temperature produces a
 * warning from the API. This helper returns `undefined` for those models
 * so that callers can spread the value conditionally:
 *
 *     generateObject({
 *       model: aiProvider(modelId),
 *       prompt,
 *       schema,
 *       temperature: resolveTemperature(providerName, modelId, 0.5),
 *     });
 *
 * When `resolveTemperature` returns `undefined`, the Vercel AI SDK
 * simply omits the parameter from the upstream request.
 */
export function resolveTemperature(
  providerName: string | undefined,
  modelId: string | undefined,
  preferred: number,
): number | undefined {
  if (!providerName || !modelId) return preferred;

  if (providerName === 'anthropic') {
    // Claude Opus 4.7 and future 4.x+ models deprecate temperature.
    // Match both plain ids and 1M-context/thinking variants.
    if (/^claude-opus-4-7(\b|[-_])/.test(modelId)) return undefined;
    if (/^claude-opus-4-8(\b|[-_])/.test(modelId)) return undefined;
    if (/^claude-sonnet-4-7(\b|[-_])/.test(modelId)) return undefined;
    if (/^claude-sonnet-4-8(\b|[-_])/.test(modelId)) return undefined;
  }

  return preferred;
}

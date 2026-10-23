import { env } from '../config/env.js';

export const DEFAULT_TIMEOUT_MS = 60000;
export const MAX_ATTEMPT_TIMEOUT_MS = 15000;
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export const PREFERRED_FREE_MODELS = [
  // Modelos conversacionales gratuitos comprobados. Si alguno desaparece,
  // OpenRouter continúa con el siguiente y luego con los descubiertos.
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free'
];

export const DEFAULT_FREE_MODELS = ['openrouter/free'];

const MODEL_CACHE_TTL_MS = 60 * 60 * 1000;
const MODEL_DISCOVERY_TIMEOUT_MS = 3500;
let freeModelsCache = { expiresAt: 0, models: [] };
let rotationCursor = 0;
const failedModelsUntil = new Map();
const MODEL_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;

export const truncate = (value, max = 4000) => {
  if (typeof value !== 'string') return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
};

export const normalizeContext = (contexto) => {
  if (!contexto) return null;
  if (typeof contexto === 'string') {
    const trimmed = contexto.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return contexto;
};

export const formatContext = (contexto) => {
  if (!contexto) return 'Sin contexto adicional.';
  if (typeof contexto === 'string') return contexto;

  try {
    return JSON.stringify(contexto, null, 2);
  } catch {
    return String(contexto);
  }
};

export const formatHistory = (historial = []) => {
  if (!Array.isArray(historial) || historial.length === 0) return 'Sin historial previo.';

  return historial
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => `${String(item.role || 'user').toUpperCase()}: ${item.text.trim()}`)
    .join('\n');
};

export const normalizeModelName = (value, fallback = '') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const cleaned = raw
    .replace(/^models\//i, '')
    .replace(/^openrouter\/models\//i, '');
  return cleaned || fallback;
};

export const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

export const isFreeModelSlug = (value) => /:free$/i.test(String(value || '').trim());

export const isGuaranteedFreeModel = (value) => {
  const model = normalizeModelName(value);
  return model === 'openrouter/free' || isFreeModelSlug(model);
};

const configuredFreeModels = (modelo = null) => uniqueValues([
  normalizeModelName(modelo),
  normalizeModelName(env.AI.OPENROUTER_MODEL),
  ...env.AI.OPENROUTER_MODELS.map((model) => normalizeModelName(model)),
]).filter(isGuaranteedFreeModel);

const rotate = (values, offset) => {
  if (values.length < 2) return values;
  const index = offset % values.length;
  return [...values.slice(index), ...values.slice(0, index)];
};

const hasZeroPricing = (model) => {
  const prompt = Number(model?.pricing?.prompt);
  const completion = Number(model?.pricing?.completion);
  return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
};

const NON_CONVERSATIONAL_MODEL_PATTERN = /(?:^|[\/_-])(content[-_]?safety|safety|guard|moderation|classifier|reward|rerank|embedding)(?:$|[\/_:-])/i;

export const isConversationalModel = (model) => {
  const searchable = `${model?.id || ''} ${model?.name || ''}`;
  return !NON_CONVERSATIONAL_MODEL_PATTERN.test(searchable);
};

export const looksLikeClassifierOutput = (text) => {
  const value = String(text || '').trim();
  return /^(?:user\s+safety|assistant\s+safety|safety|classification|label)\s*:\s*(?:safe|unsafe|allowed|blocked)/i.test(value);
};

const conversationScore = (model) => {
  const text = `${model?.id || ''} ${model?.name || ''}`.toLowerCase();
  let score = 0;
  if (/(chat|instruct|\bit\b|gemma|nemotron|inkling|xing)/.test(text)) score += 4;
  if (/(lightning|flash|mini|small)/.test(text)) score += 2;
  if (/(code|omni|vision|\bvl\b|reasoning)/.test(text)) score -= 2;
  if (Array.isArray(model?.supported_parameters) && model.supported_parameters.includes('temperature')) score += 2;
  return score;
};

export const recordModelFailure = (model) => {
  const normalized = normalizeModelName(model);
  if (normalized && normalized !== 'openrouter/free') {
    failedModelsUntil.set(normalized, Date.now() + MODEL_FAILURE_COOLDOWN_MS);
  }
};

export const recordModelSuccess = (model) => {
  failedModelsUntil.delete(normalizeModelName(model));
};

const isCoolingDown = (model) => (failedModelsUntil.get(model) || 0) > Date.now();

export const discoverFreeModels = async () => {
  if (freeModelsCache.expiresAt > Date.now() && freeModelsCache.models.length) {
    return freeModelsCache.models;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODEL_DISCOVERY_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, { signal: controller.signal });
    if (!response.ok) return freeModelsCache.models;

    const body = await response.json().catch(() => ({}));
    const models = (Array.isArray(body?.data) ? body.data : [])
      .filter((model) => isFreeModelSlug(model?.id) && hasZeroPricing(model))
      .filter(isConversationalModel)
      .filter((model) => !Array.isArray(model?.architecture?.output_modalities)
        || model.architecture.output_modalities.includes('text'))
      .sort((a, b) => conversationScore(b) - conversationScore(a)
        || Number(b?.context_length || 0) - Number(a?.context_length || 0))
      .map((model) => normalizeModelName(model.id));

    if (models.length) {
      freeModelsCache = { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, models };
    }
    return models;
  } catch {
    return freeModelsCache.models;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const buildModelCandidates = async (modelo = null) => {
  const discovered = await discoverFreeModels();
  const configured = configuredFreeModels(modelo);
  // Una configuración antigua no debe bloquear la cadena. Cuando el catálogo
  // está disponible, solo aceptamos slugs que todavía existen.
  const explicit = discovered.length
    ? configured.filter((model) => discovered.includes(model) || PREFERRED_FREE_MODELS.includes(model))
    : configured;
  const rotatable = uniqueValues([
    ...explicit,
    ...PREFERRED_FREE_MODELS,
    ...discovered,
  ]).filter((model) => model !== 'openrouter/free');
  const healthy = rotatable.filter((model) => !isCoolingDown(model));
  // Una cadena acotada evita esperas excesivas; el cursor hace que el resto de
  // los modelos también encabece solicitudes posteriores.
  const rotated = rotate(healthy.length >= 4 ? healthy : rotatable, rotationCursor++).slice(0, 12);
  return uniqueValues([...rotated, ...DEFAULT_FREE_MODELS]);
};

// OpenRouter admite como máximo tres elementos en `models`. Cada intento toma
// dos modelos distintos y conserva el router gratuito como tercer respaldo.
export const buildAttemptModels = (candidates, attempt = 0) => {
  const directModels = candidates.filter((model) => model !== 'openrouter/free');
  const offset = attempt * 2;
  return uniqueValues([
    ...directModels.slice(offset, offset + 2),
    'openrouter/free',
  ]);
};

export const buildRequestHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
  'HTTP-Referer': env.AI.OPENROUTER_SITE_URL,
  'X-Title': env.AI.OPENROUTER_APP_NAME
});

export const isRetryableStatus = (statusCode) => [408, 429, 500, 502, 503, 504].includes(Number(statusCode));

export const extractText = (responseBody) => {
  const candidate = responseBody?.choices?.[0];
  const content = candidate?.message?.content;

  if (typeof content === 'string') {
    const text = content.trim();
    if (text) return text;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => part?.text || part?.content || '')
      .join('')
      .trim();

    if (text) return text;
  }

  const text = candidate?.text?.trim?.() || '';

  if (text) return text;

  return null;
};

const buildRequestBody = ({ systemPrompt, prompt, maxTokens = 900 }) => ({
  messages: [
    {
      role: 'system',
      content: systemPrompt.trim()
    },
    {
      role: 'user',
      content: prompt
    }
  ],
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: maxTokens,
  // Estos asistentes necesitan una respuesta directa, no cadenas extensas de
  // razonamiento. También evita que modelos gratuitos gasten todo el límite
  // antes de producir contenido visible.
  reasoning: {
    exclude: true
  }
});

export const requestOpenRouterCompletion = async ({ apiKey, model, models, prompt, systemPrompt, timeoutMs, maxTokens }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: buildRequestHeaders(apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        ...(Array.isArray(models) && models.length ? { models } : { model }),
        provider: { allow_fallbacks: true },
        ...buildRequestBody({ systemPrompt, prompt, maxTokens })
      })
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiMessage = responseBody?.error?.message || responseBody?.message || `Error al consultar OpenRouter con los modelos gratuitos.`;
      const err = new Error(apiMessage);
      err.statusCode = response.status;
      const removedModel = /(?:not a valid model|model[^.]*not found|no endpoints found)/i.test(apiMessage);
      err.retryable = removedModel || isRetryableStatus(response.status);
      err.model = responseBody?.model || model || models?.[0] || null;
      throw err;
    }

    const respuesta = extractText(responseBody);
    const finishReason = responseBody?.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      const err = new Error('El modelo agotó el límite antes de completar la respuesta.');
      err.statusCode = 502;
      err.retryable = true;
      err.model = responseBody?.model || model || models?.[0] || null;
      throw err;
    }
    if (!respuesta || looksLikeClassifierOutput(respuesta)) {
      const apiMessage = responseBody?.error?.message || responseBody?.message || `OpenRouter no devolvió texto con los modelos gratuitos.`;
      const err = new Error(apiMessage);
      err.statusCode = 502;
      err.retryable = true;
      err.model = responseBody?.model || model || models?.[0] || null;
      throw err;
    }

    return {
      respuesta,
      modelo: responseBody?.model || model || models?.[0] || null,
      responseBody
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('La consulta a OpenRouter superó el tiempo de espera.');
      timeoutError.statusCode = 504;
      timeoutError.retryable = true;
      throw timeoutError;
    }

    if (err.statusCode == null) {
      err.statusCode = 502;
    }

    if (err.retryable == null) {
      err.retryable = true;
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

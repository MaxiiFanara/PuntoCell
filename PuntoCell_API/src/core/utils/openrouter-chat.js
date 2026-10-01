import { env } from '../config/env.js';

export const DEFAULT_TIMEOUT_MS = 30000;
export const MAX_ATTEMPT_TIMEOUT_MS = 12000;
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_FREE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'nousresearch/hermes-3-llama-3.1-8b:free'
];

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
    .replace(/^openrouter\//i, '')
    .replace(/^openrouter\/models\//i, '');
  return cleaned || fallback;
};

export const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

export const isFreeModelSlug = (value) => /:free$/i.test(String(value || '').trim());

export const buildModelCandidates = (modelo = null) => uniqueValues([
  normalizeModelName(modelo),
  normalizeModelName(env.AI.OPENROUTER_MODEL),
  ...env.AI.OPENROUTER_MODELS.map((model) => normalizeModelName(model)),
  ...DEFAULT_FREE_MODELS,
]);

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

  if (typeof candidate?.message?.reasoning === 'string') {
    const reasoning = candidate.message.reasoning.trim();
    if (reasoning) return reasoning;
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
  max_tokens: maxTokens
});

export const requestOpenRouterCompletion = async ({ apiKey, model, prompt, systemPrompt, timeoutMs, maxTokens }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: buildRequestHeaders(apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        model,
        ...buildRequestBody({ systemPrompt, prompt, maxTokens })
      })
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiMessage = responseBody?.error?.message || responseBody?.message || `Error al consultar OpenRouter con el modelo ${model}.`;
      const err = new Error(apiMessage);
      err.statusCode = response.status;
      err.retryable = isRetryableStatus(response.status);
      throw err;
    }

    const respuesta = extractText(responseBody);
    if (!respuesta) {
      const apiMessage = responseBody?.error?.message || responseBody?.message || `OpenRouter no devolvió texto con el modelo ${model}.`;
      const err = new Error(apiMessage);
      err.statusCode = 502;
      err.retryable = true;
      throw err;
    }

    return {
      respuesta,
      responseBody
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`La consulta a OpenRouter superó el tiempo de espera para ${model}.`);
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
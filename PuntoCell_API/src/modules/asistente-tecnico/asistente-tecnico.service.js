import { env } from '../../core/config/env.js';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_ATTEMPT_TIMEOUT_MS = 12000;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'nousresearch/hermes-3-llama-3.1-8b:free'
];

const SYSTEM_PROMPT = `
Sos un asistente técnico especializado en reparación de celulares para PuntoCell.
Respondé siempre en español, con tono profesional y directo.

Objetivo:
- Ayudar al técnico a diagnosticar fallas probables a partir de síntomas, contexto del dispositivo y acciones ya realizadas.
- Dar recomendaciones concretas sobre cómo proceder, qué medir, qué revisar y qué descartar.
- No afirmes diagnósticos absolutos si faltan pruebas.
- Priorizá pruebas no destructivas y seguras antes de sugerir reemplazos o intervenciones invasivas.

Reglas:
- Si faltan datos importantes, hacé una sola ronda breve de preguntas y no des diagnóstico preliminar en la misma respuesta.
- Hacé como máximo 3 preguntas, pero preferí 1 o 2 si alcanzan para destrabar el caso.
- No repitas preguntas que el técnico ya respondió en el mensaje actual.
- Tratá el historial de conversación como fuente de verdad: si una respuesta ya aparece allí, no la vuelvas a pedir ni a duplicar.
- Si el mensaje ya trae la información clave, no vuelvas a preguntar: pasá directo al análisis.
- Diferenciá entre fallas de software, alimentación/carga, pantalla, flex, batería, placa, humedad y daño mecánico.
- Si el caso sugiere corto, humedad, sobrecalentamiento o riesgo eléctrico, avisalo de forma explícita.
- No inventes compatibilidades ni pasos que requieran herramientas no estándar sin aclararlo.
- Si hay señales de falla de placa, sugerí verificación de consumo, cortos, líneas de alimentación y microsoldadura solo como última etapa.

Modo de respuesta:
- Si faltan datos críticos: respondé SOLO con las preguntas necesarias, en formato corto y ordenado.
- Si ya hay datos suficientes: respondé con el análisis técnico completo.
- No combines preguntas de aclaración con un informe largo en la misma respuesta.

Formato de respuesta:
1. Resumen breve del caso.
2. Hipótesis más probables ordenadas por prioridad.
3. Pruebas o verificaciones recomendadas.
4. Siguiente paso sugerido.
5. Alertas o precauciones, si aplican.
`;

const truncate = (value, max = 4000) => {
  if (typeof value !== 'string') return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
};

const normalizeContext = (contexto) => {
  if (!contexto) return null;
  if (typeof contexto === 'string') {
    const trimmed = contexto.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch {
      return trimmed;
    }
  }

  return contexto;
};

const formatContext = (contexto) => {
  if (!contexto) return 'Sin contexto adicional.';
  if (typeof contexto === 'string') return contexto;

  try {
    return JSON.stringify(contexto, null, 2);
  } catch {
    return String(contexto);
  }
};

const formatHistory = (historial = []) => {
  if (!Array.isArray(historial) || historial.length === 0) return 'Sin historial previo.';

  return historial
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => `${String(item.role || 'user').toUpperCase()}: ${item.text.trim()}`)
    .join('\n');
};

const normalizeModelName = (value, fallback = '') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const cleaned = raw
    .replace(/^models\//i, '')
    .replace(/^openrouter\//i, '')
    .replace(/^openrouter\/models\//i, '');
  return cleaned || fallback;
};

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const buildModelCandidates = (modelo = null) => uniqueValues([
  normalizeModelName(modelo),
  normalizeModelName(env.AI.OPENROUTER_MODEL),
  ...env.AI.OPENROUTER_MODELS.map((model) => normalizeModelName(model)),
  ...DEFAULT_FREE_MODELS
]);

const buildPrompt = ({ mensaje, contexto, historial, user }) => {
  const normalizedContext = normalizeContext(contexto);
  const technicianInfo = user
    ? {
        id: user.id ?? null,
        rol: user.rol ?? null,
        sucursal: user.sucursal ?? null
      }
    : null;

  const prompt = [
    'Contexto del técnico:',
    formatContext(technicianInfo),
    '',
    'Contexto del caso:',
    formatContext(normalizedContext),
    '',
    'Historial breve de la conversación:',
    formatHistory(historial),
    '',
    'Mensaje del técnico:',
    truncate(String(mensaje || '').trim(), 4000)
  ].join('\n');

  return prompt;
};

const extractText = (responseBody) => {
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

  const fallback = responseBody?.error?.message
    || responseBody?.message
    || 'No se pudo obtener una respuesta útil del modelo.';
  return String(fallback);
};

const buildRequestBody = ({ prompt }) => ({
  messages: [
    {
      role: 'system',
      content: SYSTEM_PROMPT.trim()
    },
    {
      role: 'user',
      content: prompt
    }
  ],
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 900
});

const buildRequestHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
  'HTTP-Referer': env.AI.OPENROUTER_SITE_URL,
  'X-Title': env.AI.OPENROUTER_APP_NAME
});

const isRetryableStatus = (statusCode) => [408, 429, 500, 502, 503, 504].includes(Number(statusCode));

const requestOpenRouterCompletion = async ({ apiKey, model, prompt, timeoutMs }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: buildRequestHeaders(apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        model,
        ...buildRequestBody({ prompt })
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
      const err = new Error(`OpenRouter no devolvió texto con el modelo ${model}.`);
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

export default class AsistenteTecnicoService {
  async consultar({ mensaje, historial = [], contexto = null, modelo = null, user = null } = {}) {
    const textoMensaje = String(mensaje || '').trim();
    if (!textoMensaje) {
      const err = new Error('El mensaje es obligatorio.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedContext = normalizeContext(contexto);

    const apiKey = env.AI.OPENROUTER_API_KEY;
    if (!apiKey) {
      const err = new Error('No está configurada la API key de OpenRouter.');
      err.statusCode = 503;
      throw err;
    }

    const prompt = buildPrompt({ mensaje: textoMensaje, contexto: normalizedContext, historial, user });
    const candidateModels = buildModelCandidates(modelo);
    const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
    let lastError = null;

    for (const selectedModel of candidateModels) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      const attemptTimeoutMs = Math.min(remainingMs, MAX_ATTEMPT_TIMEOUT_MS);

      try {
        const { respuesta } = await requestOpenRouterCompletion({
          apiKey,
          model: selectedModel,
          prompt,
          timeoutMs: attemptTimeoutMs
        });

        return {
          respuesta,
          modelo: selectedModel,
          contextoUsado: normalizedContext ? formatContext(normalizedContext) : null
        };
      } catch (err) {
        lastError = err;

        if (err.statusCode === 401 || err.statusCode === 403 || err.retryable === false) {
          throw err;
        }
      }
    }

    const error = lastError || new Error('No se pudo obtener una respuesta de OpenRouter.');
    if (!error.statusCode) {
      error.statusCode = 502;
    }

    error.message = `No se pudo obtener una respuesta con los modelos gratuitos de OpenRouter. ${error.message}`;
    throw error;
  }
}
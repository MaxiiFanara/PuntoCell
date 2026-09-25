import { env } from '../../core/config/env.js';

const DEFAULT_TIMEOUT_MS = 30000;

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

const normalizeModelName = (value, fallback = 'gemini-3.5-flash-lite') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const cleaned = raw.replace(/^models\//i, '');
  return cleaned || fallback;
};

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
  const candidate = responseBody?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.map((part) => part?.text || '').join('').trim();

  if (text) return text;

  const fallback = responseBody?.promptFeedback?.blockReason || 'No se pudo obtener una respuesta útil del modelo.';
  return String(fallback);
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

    const apiKey = env.AI.GEMINI_API_KEY;
    if (!apiKey) {
      const err = new Error('No está configurada la API key de Gemini.');
      err.statusCode = 503;
      throw err;
    }

    const selectedModel = normalizeModelName(modelo || env.AI.GEMINI_MODEL || 'gemini-3.5-flash-lite');
    const prompt = buildPrompt({ mensaje: textoMensaje, contexto: normalizedContext, historial, user });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT.trim() }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
              maxOutputTokens: 900
            }
          })
        }
      );

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const apiMessage = responseBody?.error?.message || 'Error al consultar Gemini.';
        const err = new Error(apiMessage);
        err.statusCode = response.status >= 500 ? 502 : response.status;
        throw err;
      }

      const respuesta = extractText(responseBody);

      return {
        respuesta,
        modelo: selectedModel,
        contextoUsado: normalizedContext ? formatContext(normalizedContext) : null
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutError = new Error('La consulta a Gemini superó el tiempo de espera.');
        timeoutError.statusCode = 504;
        throw timeoutError;
      }

      if (!err.statusCode) {
        err.statusCode = 502;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
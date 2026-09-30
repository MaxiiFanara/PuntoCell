import {
  DEFAULT_TIMEOUT_MS,
  MAX_ATTEMPT_TIMEOUT_MS,
  formatContext,
  formatHistory,
  normalizeContext,
  normalizeModelName,
  requestOpenRouterCompletion,
  truncate
} from '../../core/utils/openrouter-chat.js';

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

export default class AsistenteTecnicoService {
  async consultar({ mensaje, historial = [], contexto = null, modelo = null, user = null } = {}) {
    const textoMensaje = String(mensaje || '').trim();
    if (!textoMensaje) {
      const err = new Error('El mensaje es obligatorio.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedContext = normalizeContext(contexto);

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!apiKey) {
      const err = new Error('No está configurada la API key de OpenRouter.');
      err.statusCode = 503;
      throw err;
    }

    const prompt = buildPrompt({ mensaje: textoMensaje, contexto: normalizedContext, historial, user });
    const primaryModel = normalizeModelName(modelo, '') || normalizeModelName(process.env.OPENROUTER_MODEL, '');
    const candidateModels = primaryModel ? [primaryModel] : [];
    const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
    let lastError = null;

    if (!candidateModels.length) {
      const err = new Error('No está configurado el modelo de OpenRouter.');
      err.statusCode = 503;
      throw err;
    }

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
          systemPrompt: SYSTEM_PROMPT,
          timeoutMs: attemptTimeoutMs
        });

        return {
          respuesta,
          modelo: selectedModel,
          contextoUsado: normalizedContext ? formatContext(normalizedContext) : null
        };
      } catch (err) {
        lastError = err;

        if (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 422 || err.retryable === false) {
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
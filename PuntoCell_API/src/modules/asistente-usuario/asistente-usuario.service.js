import {
  DEFAULT_TIMEOUT_MS,
  MAX_ATTEMPT_TIMEOUT_MS,
  buildModelCandidates,
  formatContext,
  formatHistory,
  normalizeContext,
  requestOpenRouterCompletion,
  truncate
} from '../../core/utils/openrouter-chat.js';

const SYSTEM_PROMPT = `
Sos un asistente de ayuda para usuarios comunes de PuntoCell.
Respondé siempre en español, con tono claro, cordial y práctico.

Objetivo:
- Explicar cómo usar el sistema paso a paso, como si fuera un manual de usuario guiado.
- Decir dónde hacer clic, qué botón usar, qué campos completar y qué esperar después.
- Ayudar a entender pantallas, módulos, permisos y flujos del sistema sin inventar funciones.
- Priorizar instrucciones simples y concretas, adaptadas al contexto de la pantalla actual.

Reglas:
- Si la pregunta es ambigua o faltan datos, hacé como máximo 3 preguntas breves antes de responder con instrucciones.
- Si el contexto ya indica una pantalla, usalo para orientar la respuesta.
- Si una función depende del rol o de permisos, aclaralo sin asumir acceso.
- No inventes opciones, botones ni rutas del sistema.
- Si el usuario pide una acción administrativa o de alta sensibilidad, explicá que puede requerir permisos de encargado o administrador.
- Si hay varias maneras de hacer algo, recomendá la más simple.

Formato de respuesta:
1. Resumen breve de lo que necesita hacer.
2. Pasos concretos en orden.
3. Qué debería ver o revisar al terminar.
4. Errores comunes o recomendaciones útiles, si aplican.
`;

const buildPrompt = ({ mensaje, contexto, historial, user }) => {
  const normalizedContext = normalizeContext(contexto);
  const userInfo = user
    ? {
        id: user.id ?? null,
        rol: user.rol ?? null,
        sucursal: user.sucursal ?? null,
        nombre: user.nombre ?? user.user ?? null
      }
    : null;

  return [
    'Contexto del usuario:',
    formatContext(userInfo),
    '',
    'Contexto de la pantalla actual:',
    formatContext(normalizedContext),
    '',
    'Historial breve de la conversación:',
    formatHistory(historial),
    '',
    'Pregunta del usuario:',
    truncate(String(mensaje || '').trim(), 4000)
  ].join('\n');
};

export default class AsistenteUsuarioService {
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
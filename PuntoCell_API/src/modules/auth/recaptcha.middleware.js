import { env } from '../../core/config/env.js';
import { registerAudit } from '../../core/utils/audit.util.js';
import { createAssessment, RECAPTCHA_LOGIN_ACTION } from './recaptcha.service.js';
import logger from '../../core/utils/logger.js';

// Verifica el token de reCAPTCHA Enterprise que el front manda en req.body.RecaptchaToken.
// Corre antes del login para que los bots no lleguen a consultar la DB ni a comparar con
// bcrypt. Ante cualquier duda rechaza, y deja constancia del bloqueo en la bitácora.
// Con RECAPTCHA_ENABLED distinto de 'true' no hace nada.
export function createVerifyRecaptcha(bitacoraService = null) {
  const rechazar = async (req, res, status, message, detalle) => {
    await registerAudit(bitacoraService, {
      Accion: `Login bloqueado por reCAPTCHA para identificador "${req.body?.Identificador ?? ''}"`,
      detalle,
      Nivel: 'warn',
      IpAddress: req.ip
    });
    return res.status(status).json({ status: 'error', message });
  };

  return async (req, res, next) => {
    if (!env.RECAPTCHA.ENABLED) return next();

    const { API_KEY, PROJECT_ID, SITE_KEY, MIN_SCORE } = env.RECAPTCHA;
    if (!API_KEY || !PROJECT_ID || !SITE_KEY) {
      logger.error('reCAPTCHA habilitado pero faltan variables de entorno (API_KEY, PROJECT_ID o SITE_KEY).');
      return res.status(500).json({ status: 'error', message: 'Verificación reCAPTCHA no configurada' });
    }

    const token = req.body?.RecaptchaToken;
    if (!token) {
      return rechazar(req, res, 403, 'Completá el captcha para continuar.', 'Intento de login sin token reCAPTCHA');
    }

    let score;
    try {
      score = await createAssessment({ token, recaptchaAction: RECAPTCHA_LOGIN_ACTION });
    } catch (err) {
      logger.error('reCAPTCHA: error consultando CreateAssessment:', err.message);
      return res.status(503).json({ status: 'error', message: 'No se pudo verificar reCAPTCHA. Intentá nuevamente.' });
    }

    if (score === null || score < MIN_SCORE) {
      return rechazar(req, res, 403, 'No se pudo verificar el captcha. Intentá nuevamente.',
        `reCAPTCHA rechazado (puntaje: ${score ?? 'token inválido'})`);
    }

    // El token ya cumplió su función: no lo propagamos al controller.
    delete req.body.RecaptchaToken;
    next();
  };
}

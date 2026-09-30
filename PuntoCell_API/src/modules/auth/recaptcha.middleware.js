import { env } from '../../core/config/env.js';
import { registerAudit } from '../../core/utils/audit.util.js';

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TIMEOUT_MS = 5000;

// Verifica el token de reCAPTCHA invisible (v2) que el front manda en
// req.body.RecaptchaToken. Corre antes del login para que los bots no lleguen
// a consultar la DB ni a comparar con bcrypt. Ante cualquier duda, rechaza.
export function createVerifyRecaptcha(bitacoraService = null) {
  const rechazar = async (req, res, status, message, detalle) => {
    await registerAudit(bitacoraService, {
      Accion: `Login bloqueado por reCAPTCHA para identificador "${req.body?.Identificador ?? ''}"`,
      detalle,
      IpAddress: req.ip
    });
    return res.status(status).json({ status: 'error', message });
  };

  return async (req, res, next) => {
    if (!env.RECAPTCHA.ENABLED) return next();

    if (!env.RECAPTCHA.SECRET_KEY) {
      console.error('reCAPTCHA: falta RECAPTCHA_SECRET_KEY en el .env');
      return res.status(500).json({ status: 'error', message: 'Verificación reCAPTCHA no configurada' });
    }

    const token = req.body?.RecaptchaToken;
    if (!token) {
      return rechazar(req, res, 400, 'Verificación reCAPTCHA fallida', 'Intento de login sin token reCAPTCHA');
    }

    let resultado;
    try {
      const params = new URLSearchParams({ secret: env.RECAPTCHA.SECRET_KEY, response: token });
      if (req.ip) params.append('remoteip', req.ip);

      const resp = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      resultado = await resp.json();
    } catch (err) {
      console.error('reCAPTCHA: error consultando siteverify:', err.message);
      return res.status(503).json({ status: 'error', message: 'No se pudo verificar reCAPTCHA. Intentá nuevamente.' });
    }

    if (!resultado?.success) {
      const codigos = (resultado?.['error-codes'] || []).join(', ') || 'sin detalle';
      return rechazar(req, res, 400, 'Verificación reCAPTCHA fallida', `reCAPTCHA rechazado (${codigos})`);
    }

    // El token ya cumplió su función: no lo propagamos al controller.
    delete req.body.RecaptchaToken;
    next();
  };
}

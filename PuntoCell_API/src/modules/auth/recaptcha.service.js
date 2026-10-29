import { env } from '../../core/config/env.js';
import logger from '../../core/utils/logger.js';

export const RECAPTCHA_LOGIN_ACTION = 'LOGIN';

// Paso 2 de la documentación (createAssessment) usando la API REST con clave de API,
// equivalente a RecaptchaEnterpriseServiceClient.createAssessment sin credenciales de
// cuenta de servicio.
//
// projectID: ID del proyecto de Google Cloud.
// recaptchaKey: clave reCAPTCHA asociada al sitio.
// token: token generado en el cliente.
// recaptchaAction: acción que corresponde al token.
//
// Devuelve la puntuación de riesgo (0.0 - 1.0) o null si el token no es válido,
// la acción no coincide o la evaluación falla.
export async function createAssessment({
  projectID = env.RECAPTCHA.PROJECT_ID,
  recaptchaKey = env.RECAPTCHA.SITE_KEY,
  token,
  recaptchaAction = RECAPTCHA_LOGIN_ACTION
}) {
  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectID)}/assessments?key=${encodeURIComponent(env.RECAPTCHA.API_KEY)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: { token, siteKey: recaptchaKey, expectedAction: recaptchaAction } }),
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) {
    logger.error(`reCAPTCHA: CreateAssessment respondió ${res.status}`);
    return null;
  }

  const response = await res.json();

  // Verifica si el token es válido.
  if (!response.tokenProperties?.valid) {
    logger.info(`The CreateAssessment call failed because the token was: ${response.tokenProperties?.invalidReason}`);
    return null;
  }

  // Verifica si se ejecutó la acción esperada.
  if (response.tokenProperties.action === recaptchaAction) {
    logger.info(`The reCAPTCHA score is: ${response.riskAnalysis?.score}`);
    (response.riskAnalysis?.reasons || []).forEach((reason) => logger.info(reason));
    return response.riskAnalysis?.score ?? null;
  }

  logger.info('The action attribute in your reCAPTCHA tag does not match the action you are expecting to score');
  return null;
}

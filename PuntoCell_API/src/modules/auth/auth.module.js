import NotificacionService from '../notificaciones/notificacion.service.js';
import AuthService from './auth.service.js';
import AuthController from './auth.controller.js';
import { createVerifyRecaptcha } from './recaptcha.middleware.js';

export function createAuthModule(usuarioDAO, bitacoraService = null) {
  const notificacionService = new NotificacionService();

  const authService = new AuthService(usuarioDAO, notificacionService, bitacoraService);
  const authController = new AuthController(authService);
  const verifyRecaptcha = createVerifyRecaptcha(bitacoraService);

  return { authController, verifyRecaptcha };
}
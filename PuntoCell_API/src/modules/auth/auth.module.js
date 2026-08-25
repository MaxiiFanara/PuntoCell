import NotificacionService from '../notificaciones/notificacion.service.js';
import AuthService from './auth.service.js';
import AuthController from './auth.controller.js';

export function createAuthModule(usuarioDAO) {
  const notificacionService = new NotificacionService();
  
  const authService = new AuthService(usuarioDAO, notificacionService);
  const authController = new AuthController(authService);

  return { authController };
}
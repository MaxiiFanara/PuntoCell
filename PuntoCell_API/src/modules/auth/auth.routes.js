import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.dto.js';
import { preventDoubleLogin } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();
  const { authController } = container.auth;

  console.log('resetPassword:', typeof authController.resetPassword);
console.log('forgotPassword:', typeof authController.forgotPassword);

  router.post('/login',preventDoubleLogin,validateFields(loginSchema), authController.login);
  router.get('/me', authController.me);
  router.post('/logout', authController.logout);
  router.post('/forgot-password', validateFields(forgotPasswordSchema), authController.forgotPassword);
  router.post('/reset-password', validateFields(resetPasswordSchema), authController.resetPassword);

  return router;
};
import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.dto.js';
import { preventDoubleLogin } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();
  const { authController, verifyRecaptcha } = container.auth;

  router.post('/login',preventDoubleLogin,validateFields(loginSchema), verifyRecaptcha, authController.login);
  router.get('/me', authController.me);
  router.post('/logout', authController.logout);
  router.post('/forgot-password', validateFields(forgotPasswordSchema), authController.forgotPassword);
  router.post('/reset-password', validateFields(resetPasswordSchema), authController.resetPassword);

  return router;
};
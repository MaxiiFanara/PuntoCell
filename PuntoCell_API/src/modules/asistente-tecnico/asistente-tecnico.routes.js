import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { asistenteTecnicoSchema } from './asistente-tecnico.dto.js';

export default (container) => {
  const router = Router();
  const { asistenteTecnicoController } = container.asistenteTecnico;

  router.use(requireAuth);

  router.get('/consultar', asistenteTecnicoController.consultar);
  router.post('/consultar', validateFields(asistenteTecnicoSchema), asistenteTecnicoController.consultar);

  return router;
};
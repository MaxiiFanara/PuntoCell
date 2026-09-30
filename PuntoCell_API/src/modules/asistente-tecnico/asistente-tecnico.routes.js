import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { asistenteChatSchema } from '../../core/utils/asistente-chat.schema.js';

export default (container) => {
  const router = Router();
  const { asistenteTecnicoController } = container.asistenteTecnico;

  router.use(requireAuth);

  router.get('/consultar', asistenteTecnicoController.consultar);
  router.post('/consultar', validateFields(asistenteChatSchema), asistenteTecnicoController.consultar);

  return router;
};
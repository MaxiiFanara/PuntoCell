import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { accionSchema, accionUpdateSchema } from './accion/accion.dto.js';

export default (container) => {
  const router = Router();
  const { accionController, bitacoraController } = container.auditoria;

  router.get('/acciones', accionController.getAll);
  router.get('/acciones/:id', accionController.getById);
  router.post('/acciones', validateFields(accionSchema), accionController.create);
  router.put('/acciones/:id', validateFields(accionUpdateSchema), accionController.update);
  router.delete('/acciones/:id', accionController.remove);

  // Bitacora (auditoria) - listado público para el front (creación interna desde backend)
  router.get('/bitacoras', bitacoraController.getAll);

  return router;
};

import { Router } from 'express';
import CatalogoService from './catalogo.service.js';
import CatalogoController from './catalogo.controller.js';
import AsistenteCatalogoService from './asistente-catalogo.service.js';
import AsistenteCatalogoController from './asistente-catalogo.controller.js';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { asistenteChatSchema } from '../../core/utils/asistente-chat.schema.js';

// Rutas públicas (sin login) para el catálogo de venta online.
export default () => {
  const router = Router();
  const controller = new CatalogoController(new CatalogoService());
  const asistenteController = new AsistenteCatalogoController(new AsistenteCatalogoService(new CatalogoService()));

  router.get('/productos', controller.getProductos);
  router.get('/asistente/consultar', asistenteController.consultar);
  router.post('/asistente/consultar', validateFields(asistenteChatSchema), asistenteController.consultar);

  return router;
};

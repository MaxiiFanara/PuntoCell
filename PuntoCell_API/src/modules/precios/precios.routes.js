import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { listaPreciosSchema, listaPreciosUpdateSchema } from './lista-de-precios/lista-de-precios.dto.js';
import { preciosArticulosSchema, preciosArticulosUpdateSchema } from './precios-articulos/precios-articulos.dto.js';

export default (container) => {
  const router = Router();

  // Lista de precios
  router.get('/lista-de-precios', container.precios.listaPreciosController.getAll);
  router.get('/lista-de-precios/:id', container.precios.listaPreciosController.getById);
  router.post('/lista-de-precios', validateFields(listaPreciosSchema), container.precios.listaPreciosController.create);
  router.put('/lista-de-precios/:id', validateFields(listaPreciosUpdateSchema), container.precios.listaPreciosController.update);
  router.delete('/lista-de-precios/:id', container.precios.listaPreciosController.remove);

  // Precios por artículo
  router.get('/precios-articulos', container.precios.preciosArticulosController.getAll);
  router.get('/precios-articulos/:id', container.precios.preciosArticulosController.getById);
  router.post('/precios-articulos', validateFields(preciosArticulosSchema), container.precios.preciosArticulosController.create);
  router.put('/precios-articulos/:id', validateFields(preciosArticulosUpdateSchema), container.precios.preciosArticulosController.update);
  router.delete('/precios-articulos/:id', container.precios.preciosArticulosController.remove);

  return router;
};

import { Router } from 'express';
import CatalogoService from './catalogo.service.js';
import CatalogoController from './catalogo.controller.js';

// Rutas públicas (sin login) para el catálogo de venta online.
export default () => {
  const router = Router();
  const controller = new CatalogoController(new CatalogoService());

  router.get('/productos', controller.getProductos);

  return router;
};

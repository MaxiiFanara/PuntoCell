import { Router } from 'express';
import CatalogoService from '../catalogo/catalogo.service.js';
import { crearMercadoPagoClient } from './mercadopago.client.js';
import { crearPagosService } from './pagos.service.js';
import PagosController from './pagos.controller.js';
import { env } from '../../core/config/env.js';

// Rutas públicas (sin login): el comprador del catálogo no tiene cuenta.
export default () => {
  const router = Router();

  const service = crearPagosService({
    catalogoService: new CatalogoService(),
    mpClient: crearMercadoPagoClient({ accessToken: env.MP.ACCESS_TOKEN }),
    backUrlBase: env.MP.BACK_URL_BASE,
    webhookUrl: env.MP.WEBHOOK_URL,
  });

  const controller = new PagosController(service);

  router.post('/checkout', controller.postCheckout);
  router.post('/webhook', controller.postWebhook);
  // Va último: /:paymentId capturaría 'checkout' y 'webhook' si estuviera arriba.
  router.get('/:paymentId', controller.getPago);

  return router;
};

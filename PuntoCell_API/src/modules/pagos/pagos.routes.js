import { Router } from 'express';
import CatalogoService from '../catalogo/catalogo.service.js';
import { crearMercadoPagoClient } from './mercadopago.client.js';
import { crearPagosService } from './pagos.service.js';
import PagosController from './pagos.controller.js';
import { env } from '../../core/config/env.js';
import { models } from '../../models/index.js';
import VentaDAO from '../ventas/venta/venta.dao.js';
import DetalleVentaDAO from '../ventas/detalle-venta/detalle-venta.dao.js';
import VentaService from '../ventas/venta/venta.service.js';

// Rutas públicas (sin login): el comprador del catálogo no tiene cuenta.
export default () => {
  const router = Router();

  // VentaService se instancia acá igual que CatalogoService, en vez de sacarlo del
  // contenedor: ventas.module.js solo expone controllers, y no se toca. El servicio
  // se usa tal cual está — crea la venta, descuenta stock con lock y registra el
  // pago, todo en su propia transacción.
  const ventaService = new VentaService(
    new VentaDAO(models.Venta),
    new DetalleVentaDAO(models.DetalleVenta),
    null
  );

  const service = crearPagosService({
    catalogoService: new CatalogoService(),
    mpClient: crearMercadoPagoClient({ accessToken: env.MP.ACCESS_TOKEN }),
    backUrlBase: env.MP.BACK_URL_BASE,
    webhookUrl: env.MP.WEBHOOK_URL,
    models,
    ventaService,
    ventaOnline: {
      idEmpleado: env.MP.ID_EMPLEADO,
      idTurnoCaja: env.MP.ID_TURNO_CAJA,
      idMetodoPago: env.MP.ID_METODO_PAGO,
    },
  });

  const controller = new PagosController(service);

  router.post('/checkout', controller.postCheckout);
  router.post('/webhook', controller.postWebhook);
  // Va último: /:paymentId capturaría 'checkout' y 'webhook' si estuviera arriba.
  router.get('/:paymentId', controller.getPago);

  return router;
};

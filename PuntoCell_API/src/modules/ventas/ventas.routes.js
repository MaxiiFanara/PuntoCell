import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { requireCajaAbierta } from '../../core/middlewares/caja.middleware.js';
import { cotizacionSchema, cotizacionUpdateSchema } from './cotizacion/cotizacion.dto.js';
import { descuentoSchema, descuentoUpdateSchema } from './descuento/descuento.dto.js';
import { estadoReclamoSchema, estadoReclamoUpdateSchema } from './estado-reclamo/estado-reclamo.dto.js';
import { detalleDevolucionVentaSchema, detalleDevolucionVentaUpdateSchema } from './detalle-devolucion-venta/detalle-devolucion-venta.dto.js';
import { devolucionVentaSchema, devolucionVentaUpdateSchema } from './devolucion-venta/devolucion-venta.dto.js';
import { detalleVentaSchema, detalleVentaUpdateSchema } from './detalle-venta/detalle-venta.dto.js';
import { cuotaSchema, cuotaUpdateSchema } from './cuota/cuota.dto.js';
import { ventaSchema, ventaUpdateSchema } from './venta/venta.dto.js';
import { pagoVentaSchema, pagoVentaUpdateSchema } from './pago-venta/pago-venta.dto.js';
import { reclamoGarantiaSchema, reclamoGarantiaUpdateSchema } from './reclamo-garantia/reclamo-garantia.dto.js';

export default (container) => {
  const router = Router();
  const { cotizacionController, descuentoController, detalleVentaController, ventaController, pagoVentaController, cuotaController, reclamoController } = container.ventas;

  // Estado Reclamo
  const { estadoReclamoController } = container.ventas;
  const { devolucionController, detalleDevolucionController } = container.ventas;

  router.get('/cotizaciones', cotizacionController.getAll);
  router.get('/cotizaciones/:id', cotizacionController.getById);
  router.post('/cotizaciones', validateFields(cotizacionSchema), cotizacionController.create);
  router.put('/cotizaciones/:id', validateFields(cotizacionUpdateSchema), cotizacionController.update);
  router.delete('/cotizaciones/:id', cotizacionController.remove);

  // Descuentos
  router.get('/descuentos', descuentoController.getAll);
  router.get('/descuentos/:id', descuentoController.getById);
  router.post('/descuentos', validateFields(descuentoSchema), descuentoController.create);
  router.put('/descuentos/:id', validateFields(descuentoUpdateSchema), descuentoController.update);
  router.delete('/descuentos/:id', descuentoController.remove);

  // Estado Reclamo
  router.get('/estado-reclamos', estadoReclamoController.getAll);
  router.get('/estado-reclamos/:id', estadoReclamoController.getById);
  router.post('/estado-reclamos', validateFields(estadoReclamoSchema), estadoReclamoController.create);
  router.put('/estado-reclamos/:id', validateFields(estadoReclamoUpdateSchema), estadoReclamoController.update);
  router.delete('/estado-reclamos/:id', estadoReclamoController.remove);

  // Detalle Venta (individual CRUD)
  router.get('/detalle-ventas', detalleVentaController.getAll);
  router.get('/detalle-ventas/:id', detalleVentaController.getById);
  router.post('/detalle-ventas', validateFields(detalleVentaSchema), detalleVentaController.create);
  router.put('/detalle-ventas/:id', validateFields(detalleVentaUpdateSchema), detalleVentaController.update);
  router.delete('/detalle-ventas/:id', detalleVentaController.remove);

  // Cuotas
  router.get('/cuotas', cuotaController.getAll);
  router.get('/cuotas/:id', cuotaController.getById);
  router.post('/cuotas', validateFields(cuotaSchema), cuotaController.create);
  router.put('/cuotas/:id', validateFields(cuotaUpdateSchema), cuotaController.update);
  router.delete('/cuotas/:id', cuotaController.remove);

  // Reclamos de Garantia
  router.get('/reclamos-garantia', reclamoController.getAll);
  router.get('/reclamos-garantia/:id', reclamoController.getById);
  router.post('/reclamos-garantia', validateFields(reclamoGarantiaSchema), reclamoController.create);
  router.put('/reclamos-garantia/:id', validateFields(reclamoGarantiaUpdateSchema), reclamoController.update);
  router.delete('/reclamos-garantia/:id', reclamoController.remove);

  // Devoluciones
  router.get('/devoluciones', devolucionController.getAll);
  router.get('/devoluciones/:id', devolucionController.getById);
  router.post('/devoluciones', validateFields(devolucionVentaSchema), devolucionController.create);
  router.put('/devoluciones/:id', validateFields(devolucionVentaUpdateSchema), devolucionController.update);
  router.delete('/devoluciones/:id', devolucionController.remove);

  // Detalle Devolucion
  router.get('/detalle-devoluciones', detalleDevolucionController.getAll);
  router.get('/detalle-devoluciones/:id', detalleDevolucionController.getById);
  router.post('/detalle-devoluciones', validateFields(detalleDevolucionVentaSchema), detalleDevolucionController.create);
  router.put('/detalle-devoluciones/:id', validateFields(detalleDevolucionVentaUpdateSchema), detalleDevolucionController.update);
  router.delete('/detalle-devoluciones/:id', detalleDevolucionController.remove);

  // Pagos de Venta
  router.get('/pagos', pagoVentaController.getAll);
  router.get('/pagos/:id', pagoVentaController.getById);
  router.post('/pagos', validateFields(pagoVentaSchema), requireCajaAbierta(), pagoVentaController.create);
  router.put('/pagos/:id', validateFields(pagoVentaUpdateSchema), pagoVentaController.update);
  router.delete('/pagos/:id', pagoVentaController.remove);
  
  // Venta (exposed at module root: /api/ventas)
  router.get('/', ventaController.getAll);
  router.get('/historico', ventaController.historico);
  router.get('/:id', ventaController.getById);
  router.post('/', validateFields(ventaSchema), requireCajaAbierta(), ventaController.create);
  router.put('/:id', validateFields(ventaUpdateSchema), ventaController.update);
  router.delete('/:id', ventaController.remove);
  return router;
};

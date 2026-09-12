import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { proveedorSchema, proveedorUpdateSchema } from './proveedor/proveedor.dto.js';
import { compraSchema, compraUpdateSchema } from './compra/compra.dto.js';
import { detalleCompraSchema, detalleCompraUpdateSchema } from './detalle-compra/detalle-compra.dto.js';
import { detalleDevolucionCompraSchema, detalleDevolucionCompraUpdateSchema } from './detalle-devolucion-compra/detalle-devolucion-compra.dto.js';
import { devolucionCompraSchema, devolucionCompraUpdateSchema } from './devolucion-compra/devolucion-compra.dto.js';
import { pagoCompraSchema } from './pago-compra/pago-compra.dto.js';
import { ajusteCuentaProveedorSchema } from './cuenta-corriente-proveedor/cuenta-corriente-proveedor.dto.js';

export default (container) => {
  const router = Router();

  const {
    proveedorController,
    compraController,
    detalleCompraController,
    detalleDevolucionCompraController,
    devolucionCompraController,
    pagoCompraController,
    cuentaCorrienteProveedorController
  } = container.compras;

  const { comprasDashboardController } = container.dashboard;

  // Proveedor
  router.get('/proveedores', proveedorController.getAll);
  router.get('/proveedores/:id', proveedorController.getById);
  router.post('/proveedores', validateFields(proveedorSchema), proveedorController.create);
  router.put('/proveedores/:id', validateFields(proveedorUpdateSchema), proveedorController.update);
  router.delete('/proveedores/:id', proveedorController.delete);

  // Cuenta corriente del proveedor (solo lectura — los movimientos se crean
  // internamente desde Compra/PagoCompra; el único write por API es el ajuste manual)
  router.get('/proveedores/:id/saldo', cuentaCorrienteProveedorController.getSaldoPorProveedor);
  router.get('/proveedores/:idProveedor/cuenta-corriente', cuentaCorrienteProveedorController.getResumenProveedor);
  router.post('/proveedores/:idProveedor/cuenta-corriente/ajuste', validateFields(ajusteCuentaProveedorSchema), cuentaCorrienteProveedorController.crearAjuste);
  router.get('/cuenta-corriente-proveedor', cuentaCorrienteProveedorController.getAll);
  router.get('/cuenta-corriente-proveedor/:id', cuentaCorrienteProveedorController.getById);

  // Compra
  router.get('/compras', compraController.getAll);
  router.get('/compras/:id', compraController.getById);
  router.post('/compras', validateFields(compraSchema), compraController.create);
  router.put('/compras/:id', validateFields(compraUpdateSchema), compraController.update);
  router.delete('/compras/:id', compraController.delete);

  // Detalle Compra
  router.get('/detalles-compra', detalleCompraController.getAll);
  router.get('/detalles-compra/:id', detalleCompraController.getById);
  router.post('/detalles-compra', validateFields(detalleCompraSchema), detalleCompraController.create);
  router.put('/detalles-compra/:id', validateFields(detalleCompraUpdateSchema), detalleCompraController.update);
  router.delete('/detalles-compra/:id', detalleCompraController.delete);

  // Detalle Devolucion Compra
  router.get('/detalles-devolucion-compra', detalleDevolucionCompraController.getAll);
  router.get('/detalles-devolucion-compra/:id', detalleDevolucionCompraController.getById);
  router.post('/detalles-devolucion-compra', validateFields(detalleDevolucionCompraSchema), detalleDevolucionCompraController.create);
  router.put('/detalles-devolucion-compra/:id', validateFields(detalleDevolucionCompraUpdateSchema), detalleDevolucionCompraController.update);
  router.delete('/detalles-devolucion-compra/:id', detalleDevolucionCompraController.delete);

  // Devolucion Compra
  router.get('/devoluciones-compra', devolucionCompraController.getAll);
  router.get('/devoluciones-compra/:id', devolucionCompraController.getById);
  router.post('/devoluciones-compra', validateFields(devolucionCompraSchema), devolucionCompraController.create);
  router.put('/devoluciones-compra/:id', validateFields(devolucionCompraUpdateSchema), devolucionCompraController.update);
  router.delete('/devoluciones-compra/:id', devolucionCompraController.delete);

  // Pago Compra — POST registra un pago posterior sobre una Compra existente (valida
  // contra el saldo pendiente, actualiza la Compra y la cuenta corriente). Sin
  // PUT/DELETE: un pago registrado es inmutable.
  router.get('/pagos-compra', pagoCompraController.getAll);
  router.get('/pagos-compra/:id', pagoCompraController.getById);
  router.post('/pagos-compra', validateFields(pagoCompraSchema), pagoCompraController.create);

  // Analíticas / Dashboard - Compras
  router.get('/analitica/evolucion-costo', comprasDashboardController.evolucionCostoCompras);
  router.get('/analitica/por-proveedor', comprasDashboardController.comprasPorProveedor);
  router.get('/analitica/ranking-proveedores', comprasDashboardController.rankingProveedores);
  router.get('/analitica/evolucion-precio-producto', comprasDashboardController.evolucionPrecioProducto);
  router.get('/analitica/variacion-precio-proveedor', comprasDashboardController.variacionPrecioProveedor);
  router.get('/analitica/abc', comprasDashboardController.abcCompras);
  router.get('/analitica/punto-reposicion', comprasDashboardController.puntoReposicion);
  router.get('/analitica/stock-seguridad', comprasDashboardController.stockSeguridad);
  router.get('/analitica/eoq', comprasDashboardController.eoq);

  return router;
};
import { models } from '../../models/index.js';

import ProveedorDAO from './proveedor/proveedor.dao.js';
import ProveedorService from './proveedor/proveedor.service.js';
import ProveedorController from './proveedor/proveedor.controller.js';

import CompraDAO from './compra/compra.dao.js';
import CompraService from './compra/compra.service.js';
import CompraController from './compra/compra.controller.js';

import DetalleCompraDAO from './detalle-compra/detalle-compra.dao.js';
import DetalleCompraService from './detalle-compra/detalle-compra.service.js';
import DetalleCompraController from './detalle-compra/detalle-compra.controller.js';

import DetalleDevolucionCompraDAO from './detalle-devolucion-compra/detalle-devolucion-compra.dao.js';
import DetalleDevolucionCompraService from './detalle-devolucion-compra/detalle-devolucion-compra.service.js';
import DetalleDevolucionCompraController from './detalle-devolucion-compra/detalle-devolucion-compra.controller.js';

import DevolucionCompraDAO from './devolucion-compra/devolucion-compra.dao.js';
import DevolucionCompraService from './devolucion-compra/devolucion-compra.service.js';
import DevolucionCompraController from './devolucion-compra/devolucion-compra.controller.js';

import PagoCompraDAO from './pago-compra/pago-compra.dao.js';
import PagoCompraService from './pago-compra/pago-compra.service.js';
import PagoCompraController from './pago-compra/pago-compra.controller.js';

import CuentaCorrienteProveedorDAO from './cuenta-corriente-proveedor/cuenta-corriente-proveedor.dao.js';
import CuentaCorrienteProveedorService from './cuenta-corriente-proveedor/cuenta-corriente-proveedor.service.js';
import CuentaCorrienteProveedorController from './cuenta-corriente-proveedor/cuenta-corriente-proveedor.controller.js';

export function createComprasModule(bitacoraService = null) {
  const proveedorDAO = new ProveedorDAO(models.Proveedor);
  const proveedorService = new ProveedorService(proveedorDAO);
  const proveedorController = new ProveedorController(proveedorService);

  const cuentaCorrienteProveedorDAO = new CuentaCorrienteProveedorDAO(models.CuentaCorrienteProveedor);
  const cuentaCorrienteProveedorService = new CuentaCorrienteProveedorService(cuentaCorrienteProveedorDAO);
  const cuentaCorrienteProveedorController = new CuentaCorrienteProveedorController(cuentaCorrienteProveedorService);

  const detalleCompraDAO = new DetalleCompraDAO(models.DetalleCompra);
  const detalleCompraService = new DetalleCompraService(detalleCompraDAO);
  const detalleCompraController = new DetalleCompraController(detalleCompraService);

  const compraDAO = new CompraDAO(models.Compra);
  const compraService = new CompraService(compraDAO, detalleCompraDAO, cuentaCorrienteProveedorService, bitacoraService);
  const compraController = new CompraController(compraService);

  const detalleDevolucionCompraDAO = new DetalleDevolucionCompraDAO(models.DetalleDevolucionCompra);
  const detalleDevolucionCompraService = new DetalleDevolucionCompraService(detalleDevolucionCompraDAO);
  const detalleDevolucionCompraController = new DetalleDevolucionCompraController(detalleDevolucionCompraService);

  const devolucionCompraDAO = new DevolucionCompraDAO(models.DevolucionCompra);
  const devolucionCompraService = new DevolucionCompraService(devolucionCompraDAO);
  const devolucionCompraController = new DevolucionCompraController(devolucionCompraService);

  const pagoCompraDAO = new PagoCompraDAO(models.PagoCompra);
  const pagoCompraService = new PagoCompraService(pagoCompraDAO, cuentaCorrienteProveedorService);
  const pagoCompraController = new PagoCompraController(pagoCompraService);

  return {
    proveedorController,
    compraController,
    detalleCompraController,
    detalleDevolucionCompraController,
    devolucionCompraController,
    pagoCompraController,
    cuentaCorrienteProveedorController
  };
}
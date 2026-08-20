import { models } from '../../models/index.js';
import CotizacionDAO from './cotizacion/cotizacion.dao.js';
import CotizacionService from './cotizacion/cotizacion.service.js';
import CotizacionController from './cotizacion/cotizacion.controller.js';
import DescuentoDAO from './descuento/descuento.dao.js';
import DescuentoService from './descuento/descuento.service.js';
import DescuentoController from './descuento/descuento.controller.js';
import EstadoReclamoDAO from './estado-reclamo/estado-reclamo.dao.js';
import EstadoReclamoService from './estado-reclamo/estado-reclamo.service.js';
import EstadoReclamoController from './estado-reclamo/estado-reclamo.controller.js';
import DevolucionVentaDAO from './devolucion-venta/devolucion-venta.dao.js';
import DevolucionVentaService from './devolucion-venta/devolucion-venta.service.js';
import DevolucionVentaController from './devolucion-venta/devolucion-venta.controller.js';
import DetalleDevolucionVentaDAO from './detalle-devolucion-venta/detalle-devolucion-venta.dao.js';
import DetalleDevolucionVentaService from './detalle-devolucion-venta/detalle-devolucion-venta.service.js';
import DetalleDevolucionVentaController from './detalle-devolucion-venta/detalle-devolucion-venta.controller.js';
import PagoVentaDAO from './pago-venta/pago-venta.dao.js';
import PagoVentaService from './pago-venta/pago-venta.service.js';
import PagoVentaController from './pago-venta/pago-venta.controller.js';
import ReclamoGarantiaDAO from './reclamo-garantia/reclamo-garantia.dao.js';
import ReclamoGarantiaService from './reclamo-garantia/reclamo-garantia.service.js';
import ReclamoGarantiaController from './reclamo-garantia/reclamo-garantia.controller.js';
import CuotaDAO from './cuota/cuota.dao.js';
import CuotaService from './cuota/cuota.service.js';
import CuotaController from './cuota/cuota.controller.js';
import DetalleVentaDAO from './detalle-venta/detalle-venta.dao.js';
import DetalleVentaService from './detalle-venta/detalle-venta.service.js';
import DetalleVentaController from './detalle-venta/detalle-venta.controller.js';
import VentaDAO from './venta/venta.dao.js';
import VentaService from './venta/venta.service.js';
import VentaController from './venta/venta.controller.js';

export function createVentasModule() {
  const cotizacionDAO = new CotizacionDAO(models.Cotizacion);
  const cotizacionService = new CotizacionService(cotizacionDAO);
  const cotizacionController = new CotizacionController(cotizacionService);
  const descuentoDAO = new DescuentoDAO(models.Descuento);
  const descuentoService = new DescuentoService(descuentoDAO);
  const descuentoController = new DescuentoController(descuentoService);
  const estadoReclamoDAO = new EstadoReclamoDAO(models.EstadoReclamo);
  const estadoReclamoService = new EstadoReclamoService(estadoReclamoDAO);
  const estadoReclamoController = new EstadoReclamoController(estadoReclamoService);
  const detalleVentaDAO = new DetalleVentaDAO(models.DetalleVenta);
  const detalleVentaService = new DetalleVentaService(detalleVentaDAO);
  const detalleVentaController = new DetalleVentaController(detalleVentaService);
  const ventaDAO = new VentaDAO(models.Venta);
  const ventaService = new VentaService(ventaDAO, detalleVentaDAO);
  const ventaController = new VentaController(ventaService);
  const devolucionDAO = new DevolucionVentaDAO(models.DevolucionVenta);
  const detalleDevolucionDAO = new DetalleDevolucionVentaDAO(models.DetalleDevolucionVenta);
  const devolucionService = new DevolucionVentaService(devolucionDAO, detalleDevolucionDAO);
  const devolucionController = new DevolucionVentaController(devolucionService);
  const detalleDevolucionService = new DetalleDevolucionVentaService(detalleDevolucionDAO);
  const detalleDevolucionController = new DetalleDevolucionVentaController(detalleDevolucionService);
  const pagoVentaDAO = new PagoVentaDAO(models.PagoVenta);
  const pagoVentaService = new PagoVentaService(pagoVentaDAO);
  const pagoVentaController = new PagoVentaController(pagoVentaService);
  const cuotaDAO = new CuotaDAO(models.Cuota);
  const cuotaService = new CuotaService(cuotaDAO);
  const cuotaController = new CuotaController(cuotaService);
  const reclamoDAO = new ReclamoGarantiaDAO(models.ReclamoGarantia);
  const reclamoService = new ReclamoGarantiaService(reclamoDAO);
  const reclamoController = new ReclamoGarantiaController(reclamoService);

  return {
    cotizacionController,
    descuentoController,
    estadoReclamoController,
    detalleVentaController,
    ventaController,
    devolucionController,
    detalleDevolucionController
    , pagoVentaController
    , cuotaController
    , reclamoController
  };
}

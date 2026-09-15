import { models } from '../../models/index.js';
import NotificacionService from '../notificaciones/notificacion.service.js';

import EstadoOrdenDAO from './estado-orden/estado-orden.dao.js';
import EstadoOrdenService from './estado-orden/estado-orden.service.js';
import EstadoOrdenController from './estado-orden/estado-orden.controller.js';

import FallaDAO from './falla/falla.dao.js';
import FallaService from './falla/falla.service.js';
import FallaController from './falla/falla.controller.js';

import DispositivoClienteDAO from './dispositivo-cliente/dispositivo-cliente.dao.js';
import DispositivoClienteService from './dispositivo-cliente/dispositivo-cliente.service.js';
import DispositivoClienteController from './dispositivo-cliente/dispositivo-cliente.controller.js';

import OrdenReparacionDAO from './orden-reparacion/orden-reparacion.dao.js';
import OrdenReparacionService from './orden-reparacion/orden-reparacion.service.js';
import OrdenReparacionController from './orden-reparacion/orden-reparacion.controller.js';

import OrdenFallaDAO from './orden-falla/orden-falla.dao.js';
import OrdenFallaService from './orden-falla/orden-falla.service.js';
import OrdenFallaController from './orden-falla/orden-falla.controller.js';

import SeguimientoOrdenDAO from './seguimiento-orden/seguimiento-orden.dao.js';
import SeguimientoOrdenService from './seguimiento-orden/seguimiento-orden.service.js';
import SeguimientoOrdenController from './seguimiento-orden/seguimiento-orden.controller.js';

import PagoReparacionDAO from './pago-reparacion/pago-reparacion.dao.js';
import PagoReparacionService from './pago-reparacion/pago-reparacion.service.js';
import PagoReparacionController from './pago-reparacion/pago-reparacion.controller.js';

import RepuestoOrdenDAO from './repuesto-orden/repuesto-orden.dao.js';
import RepuestoOrdenService from './repuesto-orden/repuesto-orden.service.js';
import RepuestoOrdenController from './repuesto-orden/repuesto-orden.controller.js';

export function createReparacionesModule(usuarioDAO, bitacoraService = null) {

  const estadoOrdenDAO = new EstadoOrdenDAO(models.EstadoOrden);
  const estadoOrdenService = new EstadoOrdenService(estadoOrdenDAO, bitacoraService);
  const estadoOrdenController = new EstadoOrdenController(estadoOrdenService);

  const fallaDAO = new FallaDAO(models.Falla);
  const fallaService = new FallaService(fallaDAO, bitacoraService);
  const fallaController = new FallaController(fallaService);

  const dispositivoClienteDAO = new DispositivoClienteDAO(models.DispositivoCliente);
  const dispositivoClienteService = new DispositivoClienteService(dispositivoClienteDAO, bitacoraService);
  const dispositivoClienteController = new DispositivoClienteController(dispositivoClienteService);

  const ordenFallaDAO = new OrdenFallaDAO(models.OrdenFalla);
  const ordenFallaService = new OrdenFallaService(ordenFallaDAO, bitacoraService);
  const ordenFallaController = new OrdenFallaController(ordenFallaService);

  const seguimientoOrdenDAO = new SeguimientoOrdenDAO(models.SeguimientoOrden);
  const seguimientoOrdenService = new SeguimientoOrdenService(seguimientoOrdenDAO, bitacoraService);
  const seguimientoOrdenController = new SeguimientoOrdenController(seguimientoOrdenService);

  const pagoReparacionDAO = new PagoReparacionDAO(models.PagoReparacion);
  const pagoReparacionService = new PagoReparacionService(pagoReparacionDAO, bitacoraService);
  const pagoReparacionController = new PagoReparacionController(pagoReparacionService);

  const ordenReparacionDAO = new OrdenReparacionDAO(models.OrdenReparacion);

  const repuestoOrdenDAO = new RepuestoOrdenDAO(models.RepuestoOrden);
  const repuestoOrdenService = new RepuestoOrdenService(repuestoOrdenDAO, ordenReparacionDAO, bitacoraService);
  const repuestoOrdenController = new RepuestoOrdenController(repuestoOrdenService);

  // reparaciones dashboard moved to central dashboard module

  const notificacionService = new NotificacionService();

  const ordenReparacionService = new OrdenReparacionService(
    usuarioDAO,
    dispositivoClienteDAO,
    ordenReparacionDAO,
    ordenFallaDAO,
    seguimientoOrdenDAO,
    notificacionService,
    bitacoraService
  );
  const ordenReparacionController = new OrdenReparacionController(ordenReparacionService);

  return {
    estadoOrdenController,
    fallaController,
    dispositivoClienteController,
    ordenReparacionController,
    ordenFallaController,
    seguimientoOrdenController,
    pagoReparacionController,
    repuestoOrdenController
  };
}
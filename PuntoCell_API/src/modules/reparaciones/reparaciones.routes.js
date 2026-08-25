import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { isAdmin, verificarTransicionEstado } from '../../core/middlewares/auth.middleware.js';
import { nuevaReparacionSchema, cambiarEstadoSchema } from './orden-reparacion/orden-reparacion.dto.js';
import { estadoOrdenSchema, estadoOrdenUpdateSchema } from './estado-orden/estado-orden.dto.js';
import { fallaSchema, fallaUpdateSchema } from './falla/falla.dto.js';
import { dispositivoClienteSchema, dispositivoClienteUpdateSchema } from './dispositivo-cliente/dispositivo-cliente.dto.js';
import { ordenFallaSchema, ordenFallaUpdateSchema } from './orden-falla/orden-falla.dto.js';
import { seguimientoOrdenSchema, seguimientoOrdenUpdateSchema } from './seguimiento-orden/seguimiento-orden.dto.js';
import { pagoReparacionSchema, pagoReparacionUpdateSchema } from './pago-reparacion/pago-reparacion.dto.js';
import { repuestoOrdenSchema } from './repuesto-orden/repuesto-orden.dto.js';

export default (container) => {
  const router = Router();

  const {
    estadoOrdenController,
    fallaController,
    dispositivoClienteController,
    ordenReparacionController,
    ordenFallaController,
    seguimientoOrdenController,
    pagoReparacionController,
    repuestoOrdenController
  } = container.reparaciones;

  // ÓRDENES DE REPARACIÓN
  router.get('/ordenes-reparacion', ordenReparacionController.getAll);
  router.get('/ordenes-reparacion/:id', ordenReparacionController.getById);
  router.post('/ordenes-reparacion', validateFields(nuevaReparacionSchema), ordenReparacionController.create);
  router.patch('/ordenes-reparacion/:id/estado', verificarTransicionEstado, validateFields(cambiarEstadoSchema), ordenReparacionController.updateStatus);
  router.post('/ordenes-reparacion/:id/testemail', ordenReparacionController.enviarComprobante);

  // REPUESTOS
  router.get('/repuestos-orden', repuestoOrdenController.getAll);
  router.get('/repuestos-orden/:id', repuestoOrdenController.getById);
  router.post('/repuestos-orden', validateFields(repuestoOrdenSchema), repuestoOrdenController.create);
  router.delete('/repuestos-orden/:id', repuestoOrdenController.delete);
  router.get('/inventario/repuestos-disponibles', repuestoOrdenController.getRepuestosDisponibles);

  // CATÁLOGOS
  router.get('/estados-orden', estadoOrdenController.getAll);
  router.get('/estados-orden/:id', estadoOrdenController.getById);
  router.post('/estados-orden', isAdmin, validateFields(estadoOrdenSchema), estadoOrdenController.create);
  router.put('/estados-orden/:id', isAdmin, validateFields(estadoOrdenUpdateSchema), estadoOrdenController.update);
  router.delete('/estados-orden/:id', isAdmin, estadoOrdenController.delete);

  router.get('/fallas', fallaController.getAll);
  router.get('/fallas/por-categoria/:idCategoria', fallaController.getByCategoriaArticulo); // 👈 antes del :id
  router.get('/fallas/:id', fallaController.getById);
  router.post('/fallas', isAdmin, validateFields(fallaSchema), fallaController.create);
  router.put('/fallas/:id', isAdmin, validateFields(fallaUpdateSchema), fallaController.update);
  router.delete('/fallas/:id', isAdmin, fallaController.delete);

  router.get('/dispositivos-cliente', dispositivoClienteController.getAll);
  router.get('/dispositivos-cliente/:id', dispositivoClienteController.getById);
  router.post('/dispositivos-cliente', validateFields(dispositivoClienteSchema), dispositivoClienteController.create);
  router.put('/dispositivos-cliente/:id', validateFields(dispositivoClienteUpdateSchema), dispositivoClienteController.update);
  router.delete('/dispositivos-cliente/:id', dispositivoClienteController.delete);

  router.get('/orden-fallas', ordenFallaController.getAll);
  router.get('/orden-fallas/:id', ordenFallaController.getById);
  router.post('/orden-fallas', validateFields(ordenFallaSchema), ordenFallaController.create);
  router.put('/orden-fallas/:id', validateFields(ordenFallaUpdateSchema), ordenFallaController.update);
  router.delete('/orden-fallas/:id', ordenFallaController.delete);

  router.get('/seguimientos-orden', seguimientoOrdenController.getAll);
  router.get('/seguimientos-orden/:id', seguimientoOrdenController.getById);
  router.post('/seguimientos-orden', validateFields(seguimientoOrdenSchema), seguimientoOrdenController.create);
  router.put('/seguimientos-orden/:id', validateFields(seguimientoOrdenUpdateSchema), seguimientoOrdenController.update);
  router.delete('/seguimientos-orden/:id', seguimientoOrdenController.delete);

  router.get('/pagos-reparacion', pagoReparacionController.getAll);
  router.get('/pagos-reparacion/:id', pagoReparacionController.getById);
  router.post('/pagos-reparacion', validateFields(pagoReparacionSchema), pagoReparacionController.create);
  router.put('/pagos-reparacion/:id', validateFields(pagoReparacionUpdateSchema), pagoReparacionController.update);
  router.delete('/pagos-reparacion/:id', pagoReparacionController.delete);

  return router;
};
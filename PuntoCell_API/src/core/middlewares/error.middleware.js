import { registerAudit } from '../utils/audit.util.js';
import logger from '../utils/logger.js';

// Status que representan un "fallo de permisos/negocio" y que sí se auditan:
// 401 (sin sesión), 403 (sin permiso), 404 (recurso inexistente), 409 (conflicto).
// Se dejan afuera: 400 (validación de formato, puro ruido) y 5xx (bug del server,
// ya los loguea el propio middleware por consola).
const AUDIT_STATUS = new Set([401, 403, 404, 409]);
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const createErrorMiddleware = (bitacoraService = null) => (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let detalles = null;

  // Errores de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409; // Conflict: el recurso ya existe
    // Red de seguridad ante condición de carrera (dos altas simultáneas con el mismo IMEI)
    const original = (err.original && err.original.message) || '';
    message = /UQ_Inventario_IMEI/i.test(original)
      ? 'Ya existe un producto en inventario con ese IMEI.'
      : 'Error de validación en la base de datos.';
    detalles = err.errors.map(e => e.message);
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Error de validación en la base de datos.';
    detalles = err.errors.map(e => e.message);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso.';
  }

  // Solo se loguea si es un 500 no esperado, para no ensuciar la consola con 404/400
  if (statusCode === 500) {
    logger.error(`[ERROR CRÍTICO] ${req.method} ${req.originalUrl}: ${err.message}`, {
      stack: err.stack,
      sqlMessage: err.original?.message,
      IdEmpleado: req.user?.id,
      IdSucursal: req.user?.sucursal,
      Ip: req.ip
    });
  }

  // Auditoría centralizada de fallos de permisos/negocio (los éxitos los audita
  // cada service). Solo para requests que mutan datos o para 401/403 (acceso denegado).
  if (bitacoraService && AUDIT_STATUS.has(statusCode) && (MUTATING.has(req.method) || statusCode === 401 || statusCode === 403)) {
    registerAudit(bitacoraService, {
      Accion: `Intento rechazado (${statusCode}): ${req.method} ${req.originalUrl}`.slice(0, 150),
      detalle: message,
      Nivel: 'warn',
      IdEmpleado: req.user?.id ?? null,
      IdSucursal: req.user?.sucursal ?? null,
      IpAddress: req.ip
    }).catch(() => {});
  }

  const errorResponse = {
    // 4xx = culpa del cliente ('fail'), 5xx = error nuestro ('error')
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message: message
  };

  if (detalles) {
    errorResponse.detalles = detalles;
  }

  // IMEI ya existente sin stock: el front puede ofrecer reingresarlo (garantía/reparación/recompra)
  if (err.reingreso !== undefined) {
    errorResponse.reingreso = err.reingreso;
    errorResponse.idInventarioExistente = err.idInventarioExistente;
  }

  return res.status(statusCode).json(errorResponse);
};

// Compat: algunos imports usan `errorMiddleware` directo (sin bitácora).
export const errorMiddleware = createErrorMiddleware(null);

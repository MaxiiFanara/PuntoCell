import Joi from 'joi';

const detalleSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).required(),
  IdArticulo: Joi.number().integer().required(),
  // El service crea el MovimientoStock internamente (ver devolucion-venta.service.js), así
  // que ya no hace falta que el cliente lo mande. Se acepta si viene, pero se ignora.
  IdMovimientoStock: Joi.number().integer().optional()
});

export const devolucionVentaSchema = Joi.object({
  Fecha: Joi.date().required(),
  MontoDevuelto: Joi.number().precision(2).min(0).required(),
  Observaciones: Joi.string().optional().allow(null,''),
  IdVenta: Joi.number().integer().required(),
  IdTurnoCaja: Joi.number().integer().required(),
  IdEmpleado: Joi.number().integer().required(),
  Detalles: Joi.array().items(detalleSchema).min(1).required()
});

export const devolucionVentaUpdateSchema = Joi.object({
  Fecha: Joi.date().optional(),
  MontoDevuelto: Joi.number().precision(2).min(0).optional(),
  Observaciones: Joi.string().optional().allow(null,''),
  IdVenta: Joi.number().integer().optional(),
  IdTurnoCaja: Joi.number().integer().optional(),
  IdEmpleado: Joi.number().integer().optional(),
  Detalles: Joi.array().items(detalleSchema).optional()
});

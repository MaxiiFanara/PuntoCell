import Joi from 'joi';

export const movimientoStockSchema = Joi.object({
  Fecha: Joi.date().required(),
  TipoMovimiento: Joi.string().max(50).required(),
  Cantidad: Joi.number().integer().required(),
  Observaciones: Joi.string().max(1000).optional().allow(null, ''),
  IdInventario: Joi.number().integer().required(),
  IdEmpleado: Joi.number().integer().required()
});

export const movimientoStockUpdateSchema = Joi.object({
  Fecha: Joi.date().optional(),
  TipoMovimiento: Joi.string().max(50).optional(),
  Cantidad: Joi.number().integer().optional(),
  Observaciones: Joi.string().max(1000).optional().allow(null, ''),
  IdInventario: Joi.number().integer().optional(),
  IdEmpleado: Joi.number().integer().optional()
});

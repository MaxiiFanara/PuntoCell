import Joi from 'joi';

export const detalleVentaSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).required(),
  PrecioUnitario: Joi.number().precision(2).min(0).required(),
  IdVenta: Joi.number().integer().required(),
  IdArticulo: Joi.number().integer().required()
});

export const detalleVentaUpdateSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).optional(),
  PrecioUnitario: Joi.number().precision(2).min(0).optional(),
  IdVenta: Joi.number().integer().optional(),
  IdArticulo: Joi.number().integer().optional()
});

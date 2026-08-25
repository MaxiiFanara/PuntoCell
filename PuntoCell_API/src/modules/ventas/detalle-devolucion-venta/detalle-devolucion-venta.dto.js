import Joi from 'joi';

export const detalleDevolucionVentaSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).required(),
  IdDevolucionVenta: Joi.number().integer().required(),
  IdArticulo: Joi.number().integer().required(),
  IdMovimientoStock: Joi.number().integer().required()
});

export const detalleDevolucionVentaUpdateSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).optional(),
  IdDevolucionVenta: Joi.number().integer().optional(),
  IdArticulo: Joi.number().integer().optional(),
  IdMovimientoStock: Joi.number().integer().optional()
});

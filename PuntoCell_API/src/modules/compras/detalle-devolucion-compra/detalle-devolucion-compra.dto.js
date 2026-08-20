import Joi from 'joi';

export const detalleDevolucionCompraSchema = Joi.object({
  Cantidad: Joi.number().integer().min(1).required(),
  IdDevolucionCompra: Joi.number().integer().positive().required(),
  IdArticulo: Joi.number().integer().positive().required(),
  IdMovimientoStock: Joi.number().integer().positive().required()
});

export const detalleDevolucionCompraUpdateSchema = Joi.object({
  Cantidad: Joi.number().integer().min(1),
  IdDevolucionCompra: Joi.number().integer().positive(),
  IdArticulo: Joi.number().integer().positive(),
  IdMovimientoStock: Joi.number().integer().positive()
});
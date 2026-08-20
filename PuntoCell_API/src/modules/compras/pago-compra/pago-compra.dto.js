import Joi from 'joi';

export const pagoCompraSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).required(),
  FechaPago: Joi.date().iso().optional(),
  IdCompra: Joi.number().integer().positive().required(),
  IdMetodoPago: Joi.number().integer().positive().required(),
  IdTurnoCaja: Joi.number().integer().positive().required()
});

export const pagoCompraUpdateSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0),
  FechaPago: Joi.date().iso(),
  IdCompra: Joi.number().integer().positive(),
  IdMetodoPago: Joi.number().integer().positive(),
  IdTurnoCaja: Joi.number().integer().positive()
});
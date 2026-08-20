import Joi from 'joi';

export const devolucionCompraSchema = Joi.object({
  Fecha: Joi.date().iso().optional(),
  MontoRecuperado: Joi.number().precision(2).min(0).required(),
  Motivo: Joi.string().max(200).required(),
  IdCompra: Joi.number().integer().positive().required(),
  IdTurnoCaja: Joi.number().integer().positive().required(),
  IdEmpleado: Joi.number().integer().positive().required()
});

export const devolucionCompraUpdateSchema = Joi.object({
  Fecha: Joi.date().iso(),
  MontoRecuperado: Joi.number().precision(2).min(0),
  Motivo: Joi.string().max(200),
  IdCompra: Joi.number().integer().positive(),
  IdTurnoCaja: Joi.number().integer().positive(),
  IdEmpleado: Joi.number().integer().positive()
});
import Joi from 'joi';

export const cuotaSchema = Joi.object({
  NumeroCuota: Joi.number().integer().greater(0).required(),
  MontoCuota: Joi.number().precision(2).greater(0).required(),
  FechaVencimiento: Joi.date().required(),
  FechaPago: Joi.date().optional().allow(null),
  Recargo: Joi.number().precision(2).min(0).optional().allow(null),
  IdVenta: Joi.number().integer().required(),
  IdTurnoCaja: Joi.number().integer().required()
});

export const cuotaUpdateSchema = Joi.object({
  NumeroCuota: Joi.number().integer().greater(0).optional(),
  MontoCuota: Joi.number().precision(2).greater(0).optional(),
  FechaVencimiento: Joi.date().optional(),
  FechaPago: Joi.date().optional().allow(null),
  Recargo: Joi.number().precision(2).min(0).optional().allow(null),
  IdVenta: Joi.number().integer().optional(),
  IdTurnoCaja: Joi.number().integer().optional()
});

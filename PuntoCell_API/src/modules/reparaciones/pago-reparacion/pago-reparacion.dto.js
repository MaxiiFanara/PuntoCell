import Joi from 'joi';

export const pagoReparacionSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).required(),
  Senia: Joi.number().precision(2).min(0).optional(),
  FechaPago: Joi.date().iso().optional(),
  Observacion: Joi.string().max(200).allow(null, '').optional(),
  IdOrdenReparacion: Joi.number().integer().positive().required(),
  IdMetodoPago: Joi.number().integer().positive().required(),
  IdTurnoCaja: Joi.number().integer().positive().required()
});

export const pagoReparacionUpdateSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0),
  Senia: Joi.number().precision(2).min(0),
  FechaPago: Joi.date().iso(),
  Observacion: Joi.string().max(200).allow(null, ''),
  IdOrdenReparacion: Joi.number().integer().positive(),
  IdMetodoPago: Joi.number().integer().positive(),
  IdTurnoCaja: Joi.number().integer().positive()
});
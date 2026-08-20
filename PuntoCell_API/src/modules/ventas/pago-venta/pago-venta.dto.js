import Joi from 'joi';

export const pagoVentaSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).required(),
  FechaPago: Joi.date().required(),
  Observacion: Joi.string().max(200).optional().allow(null,''),
  Pagado: Joi.boolean().optional(),
  IdVenta: Joi.number().integer().required(),
  IdMetodoPago: Joi.number().integer().required(),
  IdTurnoCaja: Joi.number().integer().required()
});

export const pagoVentaUpdateSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).optional(),
  FechaPago: Joi.date().optional(),
  Observacion: Joi.string().max(200).optional().allow(null,''),
  Pagado: Joi.boolean().optional(),
  IdVenta: Joi.number().integer().optional(),
  IdMetodoPago: Joi.number().integer().optional(),
  IdTurnoCaja: Joi.number().integer().optional()
});

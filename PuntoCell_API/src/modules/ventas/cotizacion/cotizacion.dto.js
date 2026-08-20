import Joi from 'joi';

export const cotizacionSchema = Joi.object({
  Clave: Joi.string().max(50).required(),
  Valor: Joi.number().precision(2).required(),
  CreatedAt: Joi.date().optional().allow(null)
});

export const cotizacionUpdateSchema = Joi.object({
  Clave: Joi.string().max(50).optional(),
  Valor: Joi.number().precision(2).optional(),
  CreatedAt: Joi.date().optional().allow(null)
});

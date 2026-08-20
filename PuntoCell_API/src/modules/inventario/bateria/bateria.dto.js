import Joi from 'joi';

export const bateriaSchema = Joi.object({
  Capacidad: Joi.string().max(50).required(),
  Porcentaje: Joi.number().precision(2).min(0).max(100).required(),
  CiclosCarga: Joi.number().integer().min(0).required()
});

export const bateriaUpdateSchema = Joi.object({
  Capacidad: Joi.string().max(50).optional(),
  Porcentaje: Joi.number().precision(2).min(0).max(100).optional(),
  CiclosCarga: Joi.number().integer().min(0).optional()
});

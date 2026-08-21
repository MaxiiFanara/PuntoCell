import Joi from 'joi';

export const accionSchema = Joi.object({
  Nombre: Joi.string().max(100).required(),
  IdPermiso: Joi.number().integer().optional(),
  CreatedAt: Joi.date().optional()
});

export const accionUpdateSchema = Joi.object({
  Nombre: Joi.string().max(100).optional(),
  IdPermiso: Joi.number().integer().optional()
});

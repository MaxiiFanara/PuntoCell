import Joi from 'joi';

export const colorSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).required()
});

export const colorUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).optional()
});

import Joi from 'joi';

export const rolSchema = Joi.object({
  Nombre: Joi.string().min(3).max(100).required()
});

export const rolUpdateSchema = Joi.object({
  Nombre: Joi.string().min(3).max(100)
});
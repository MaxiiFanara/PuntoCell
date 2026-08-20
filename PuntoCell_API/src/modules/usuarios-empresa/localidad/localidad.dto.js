import Joi from 'joi';

export const localidadSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(3).max(100).required()
});

export const localidadUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(3).max(100).optional()
});
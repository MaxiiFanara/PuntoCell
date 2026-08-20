import Joi from 'joi';

export const permisoSchema = Joi.object({
  Nombre: Joi.string().min(3).max(150).required()
});

export const permisoUpdateSchema = Joi.object({
  Nombre: Joi.string().min(3).max(150)
});
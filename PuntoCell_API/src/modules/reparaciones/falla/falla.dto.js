import Joi from 'joi';

export const fallaSchema = Joi.object({
  Nombre: Joi.string().min(3).max(100).required(),
  Activa: Joi.boolean().optional(),
  IdCategoriaArticulo: Joi.number().integer().positive().required()
});

export const fallaUpdateSchema = Joi.object({
  Nombre: Joi.string().min(3).max(100),
  Activa: Joi.boolean(),
  IdCategoriaArticulo: Joi.number().integer().positive()
});
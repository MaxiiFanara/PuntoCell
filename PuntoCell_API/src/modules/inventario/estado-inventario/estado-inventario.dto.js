import Joi from 'joi';

export const estadoInventarioSchema = Joi.object({
  Nombre: Joi.string().max(50).required()
});

export const estadoInventarioUpdateSchema = Joi.object({
  Nombre: Joi.string().max(50).optional()
});

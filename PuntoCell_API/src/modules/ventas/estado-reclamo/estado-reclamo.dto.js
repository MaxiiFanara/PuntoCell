import Joi from 'joi';

export const estadoReclamoSchema = Joi.object({
  Nombre: Joi.string().max(50).required()
});

export const estadoReclamoUpdateSchema = Joi.object({
  Nombre: Joi.string().max(50).optional()
});

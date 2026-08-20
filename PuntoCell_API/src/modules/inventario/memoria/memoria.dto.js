import Joi from 'joi';

export const memoriaSchema = Joi.object({
  Capacidad: Joi.string().max(50).required()
});

export const memoriaUpdateSchema = Joi.object({
  Capacidad: Joi.string().max(50).optional()
});

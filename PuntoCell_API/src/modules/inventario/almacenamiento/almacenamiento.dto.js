import Joi from 'joi';

export const almacenamientoSchema = Joi.object({
  Capacidad: Joi.string().max(50).required()
});

export const almacenamientoUpdateSchema = Joi.object({
  Capacidad: Joi.string().max(50).optional()
});

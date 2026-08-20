import Joi from 'joi';

export const estadoOrdenSchema = Joi.object({
  Nombre: Joi.string().min(3).max(50).required()
});

export const estadoOrdenUpdateSchema = Joi.object({
  Nombre: Joi.string().min(3).max(50)
});
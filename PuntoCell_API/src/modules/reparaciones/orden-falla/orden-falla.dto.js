import Joi from 'joi';

export const ordenFallaSchema = Joi.object({
  IdOrdenReparacion: Joi.number().integer().positive().required(),
  IdFalla: Joi.number().integer().positive().required()
});

export const ordenFallaUpdateSchema = Joi.object({
  IdOrdenReparacion: Joi.number().integer().positive(),
  IdFalla: Joi.number().integer().positive()
});
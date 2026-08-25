import Joi from 'joi';

export const metodoPagoSchema = Joi.object({
  Nombre: Joi.string().max(100).required(),
  Activo: Joi.boolean().optional()
});

export const metodoPagoUpdateSchema = Joi.object({
  Nombre: Joi.string().max(100).optional(),
  Activo: Joi.boolean().optional()
});

import Joi from 'joi';

export const listaPreciosSchema = Joi.object({
  Nombre: Joi.string().max(100).required(),
  PorcentajeRentabilidad: Joi.number().precision(2).min(0).required(),
  Activo: Joi.boolean().optional()
});

export const listaPreciosUpdateSchema = Joi.object({
  Nombre: Joi.string().max(100).optional(),
  PorcentajeRentabilidad: Joi.number().precision(2).min(0).optional(),
  Activo: Joi.boolean().optional()
});

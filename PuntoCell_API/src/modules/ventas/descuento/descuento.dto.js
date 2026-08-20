import Joi from 'joi';

export const descuentoSchema = Joi.object({
  Nombre: Joi.string().max(100).required(),
  Porcentaje: Joi.number().precision(2).min(0).max(100).required(),
  Activo: Joi.boolean().optional(),
  FechaDesde: Joi.date().optional().allow(null),
  FechaHasta: Joi.date().optional().allow(null)
});

export const descuentoUpdateSchema = Joi.object({
  Nombre: Joi.string().max(100).optional(),
  Porcentaje: Joi.number().precision(2).min(0).max(100).optional(),
  Activo: Joi.boolean().optional(),
  FechaDesde: Joi.date().optional().allow(null),
  FechaHasta: Joi.date().optional().allow(null)
});

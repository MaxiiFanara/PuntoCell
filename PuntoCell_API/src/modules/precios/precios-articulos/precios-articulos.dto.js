import Joi from 'joi';

export const preciosArticulosSchema = Joi.object({
  IdInventario: Joi.number().integer().required(),
  IdListaPrecio: Joi.number().integer().required(),
  ValorFinal: Joi.number().precision(2).min(0).required(),
  FechaDesde: Joi.date().required(),
  FechaHasta: Joi.date().optional().allow(null)
});

export const preciosArticulosUpdateSchema = Joi.object({
  IdInventario: Joi.number().integer().optional(),
  IdListaPrecio: Joi.number().integer().optional(),
  ValorFinal: Joi.number().precision(2).min(0).optional(),
  FechaDesde: Joi.date().optional(),
  FechaHasta: Joi.date().optional().allow(null)
});

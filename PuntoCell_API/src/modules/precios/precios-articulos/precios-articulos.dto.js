import Joi from 'joi';

export const preciosArticulosSchema = Joi.object({
  IdInventario: Joi.number().integer().required(),
  IdListaPrecio: Joi.number().integer().required(),
  CostoBase: Joi.number().precision(2).min(0).required(),
  FijadoManual: Joi.boolean().optional().default(false),
  FechaDesde: Joi.date().required(),
  FechaHasta: Joi.date().optional().allow(null)
});

export const preciosArticulosUpdateSchema = Joi.object({
  IdInventario: Joi.number().integer().optional(),
  IdListaPrecio: Joi.number().integer().optional(),
  CostoBase: Joi.number().precision(2).min(0).optional(),
  FijadoManual: Joi.boolean().optional(),
  FechaDesde: Joi.date().optional(),
  FechaHasta: Joi.date().optional().allow(null)
});

export const bulkUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      IdInventario: Joi.number().integer().required(),
      CostoBase: Joi.number().precision(2).min(0).required(),
      FijadoManual: Joi.boolean().optional()
    })
  ).min(1).required()
});

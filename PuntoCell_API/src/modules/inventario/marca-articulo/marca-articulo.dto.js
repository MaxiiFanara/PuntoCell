import Joi from 'joi';

export const marcaArticuloSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).required(),
  EsSmartphone: Joi.boolean().optional()
});

export const marcaArticuloUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).optional(),
  EsSmartphone: Joi.boolean().optional()
});

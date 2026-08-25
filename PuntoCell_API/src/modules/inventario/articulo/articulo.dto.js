import Joi from 'joi';

export const articuloSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).required(),
  EsSerializado: Joi.boolean().required(),
  EsVendible: Joi.boolean().required(),
  EsRepuesto: Joi.boolean().required(),
  Activo: Joi.boolean().optional(),
  IdModeloArticulo: Joi.number().integer().required()
});

export const articuloUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).optional(),
  EsSerializado: Joi.boolean().optional(),
  EsVendible: Joi.boolean().optional(),
  EsRepuesto: Joi.boolean().optional(),
  Activo: Joi.boolean().optional(),
  IdModeloArticulo: Joi.number().integer().optional()
});

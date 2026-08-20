import Joi from 'joi';

export const modeloArticuloSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).required(),
  IdMarcaArticulo: Joi.number().integer().required(),
  IdCategoriaArticulo: Joi.number().integer().required()
});

export const modeloArticuloUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().max(100).optional(),
  IdMarcaArticulo: Joi.number().integer().optional(),
  IdCategoriaArticulo: Joi.number().integer().optional()
});

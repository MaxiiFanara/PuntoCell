import Joi from 'joi';

export const categoriaArticuloSchema = Joi.object({
  Nombre: Joi.string().max(100).required(),
  EsDispositivo: Joi.boolean().required()
});

export const categoriaArticuloUpdateSchema = Joi.object({
  Nombre: Joi.string().max(100).optional(),
  EsDispositivo: Joi.boolean().optional()
});

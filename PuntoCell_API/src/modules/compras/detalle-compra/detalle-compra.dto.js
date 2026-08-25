import Joi from 'joi';

export const detalleCompraSchema = Joi.object({
  Cantidad: Joi.number().integer().min(1).required(),
  PrecioCostoUnitario: Joi.number().precision(2).min(0).required(),
  IdCompra: Joi.number().integer().positive().required(),
  IdArticulo: Joi.number().integer().positive().required()
});

export const detalleCompraUpdateSchema = Joi.object({
  Cantidad: Joi.number().integer().min(1),
  PrecioCostoUnitario: Joi.number().precision(2).min(0),
  IdCompra: Joi.number().integer().positive(),
  IdArticulo: Joi.number().integer().positive()
});
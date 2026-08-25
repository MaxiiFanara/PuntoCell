import Joi from 'joi';

export const repuestoOrdenSchema = Joi.object({
  IdOrdenReparacion: Joi.number().integer().positive().required(),
  IdInventario: Joi.number().integer().positive().required(),
  Cantidad: Joi.number().integer().min(1).required()
});

export const repuestoOrdenUpdateSchema = Joi.object({
  Cantidad: Joi.number().integer().min(1),
  PrecioCobrado: Joi.number().precision(2).min(0)
});
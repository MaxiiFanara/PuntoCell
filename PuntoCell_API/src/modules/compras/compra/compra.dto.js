import Joi from 'joi';

export const compraSchema = Joi.object({
  Fecha: Joi.date().iso().optional(),
  TotalCosto: Joi.number().precision(2).min(0).required(),
  IdProveedor: Joi.number().integer().positive().required(),
  IdSucursalDestino: Joi.number().integer().positive().required(),
  IdEmpleado: Joi.number().integer().positive().required()
});

export const compraUpdateSchema = Joi.object({
  Fecha: Joi.date().iso(),
  TotalCosto: Joi.number().precision(2).min(0),
  IdProveedor: Joi.number().integer().positive(),
  IdSucursalDestino: Joi.number().integer().positive(),
  IdEmpleado: Joi.number().integer().positive()
});
import Joi from 'joi';

export const transferenciaSchema = Joi.object({
  IdSucursalOrigen: Joi.number().integer().required(),
  IdSucursalDestino: Joi.number().integer().required(),
  IdMovimientoSalida: Joi.number().integer().required(),
  IdMovimientoIngreso: Joi.number().integer().required()
});

export const transferenciaUpdateSchema = Joi.object({
  IdSucursalOrigen: Joi.number().integer().optional(),
  IdSucursalDestino: Joi.number().integer().optional(),
  IdMovimientoSalida: Joi.number().integer().optional(),
  IdMovimientoIngreso: Joi.number().integer().optional()
});

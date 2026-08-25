import Joi from 'joi';

export const dispositivoClienteSchema = Joi.object({
  IMEI: Joi.string().max(50).required(),
  Desbloqueo: Joi.string().max(100).required(),
  Observaciones: Joi.string().max(500).allow('').required(),
  IdCliente: Joi.number().integer().positive().required(),
  IdModeloArticulo: Joi.number().integer().positive().required(),
  IdColor: Joi.number().integer().positive().allow(null).optional(),
  IdMemoria: Joi.number().integer().positive().allow(null).optional(),
  IdBateria: Joi.number().integer().positive().allow(null).optional(),
  IdAlmacenamiento: Joi.number().integer().positive().allow(null).optional()
});

export const dispositivoClienteUpdateSchema = Joi.object({
  IMEI: Joi.string().max(50),
  Desbloqueo: Joi.string().max(100),
  Observaciones: Joi.string().max(500).allow(''),
  IdCliente: Joi.number().integer().positive(),
  IdModeloArticulo: Joi.number().integer().positive(),
  IdColor: Joi.number().integer().positive().allow(null),
  IdMemoria: Joi.number().integer().positive().allow(null),
  IdBateria: Joi.number().integer().positive().allow(null),
  IdAlmacenamiento: Joi.number().integer().positive().allow(null)
});
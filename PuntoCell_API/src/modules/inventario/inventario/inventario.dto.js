import Joi from 'joi';

export const inventarioSchema = Joi.object({
  IMEI: Joi.string().max(50).optional().allow(null, ''),
  PrecioCosto: Joi.number().precision(2).min(0).required(),
  PrecioMayor: Joi.number().precision(2).min(0).optional().allow(null),
  PrecioMenor: Joi.number().precision(2).min(0).optional().allow(null),
  Stock: Joi.number().integer().min(0).optional(),
  CreatedAt: Joi.date().optional().allow(null),
  MesesGarantiaMarca: Joi.date().optional().allow(null),
  MesesGarantiaLocal: Joi.date().required(),
  Observaciones: Joi.string().max(500).optional().allow(null, ''),
  IdSucursal: Joi.number().integer().required(),
  IdArticulo: Joi.number().integer().required(),
  IdEstadoInventario: Joi.number().integer().optional(),
  IdProveedor: Joi.number().integer().required(),
  IdColor: Joi.number().integer().optional().allow(null),
  IdMemoria: Joi.number().integer().optional().allow(null),
  IdBateria: Joi.number().integer().optional().allow(null),
  IdAlmacenamiento: Joi.number().integer().optional().allow(null)
});

export const inventarioUpdateSchema = Joi.object({
  IMEI: Joi.string().max(50).optional().allow(null, ''),
  PrecioCosto: Joi.number().precision(2).min(0).optional(),
  PrecioMayor: Joi.number().precision(2).min(0).optional().allow(null),
  PrecioMenor: Joi.number().precision(2).min(0).optional().allow(null),
  Stock: Joi.number().integer().min(0).optional(),
  CreatedAt: Joi.date().optional().allow(null),
  MesesGarantiaMarca: Joi.date().optional().allow(null),
  MesesGarantiaLocal: Joi.date().optional(),
  Observaciones: Joi.string().max(500).optional().allow(null, ''),
  IdSucursal: Joi.number().integer().optional(),
  IdArticulo: Joi.number().integer().optional(),
  IdEstadoInventario: Joi.number().integer().optional(),
  IdProveedor: Joi.number().integer().optional(),
  IdColor: Joi.number().integer().optional().allow(null),
  IdMemoria: Joi.number().integer().optional().allow(null),
  IdBateria: Joi.number().integer().optional().allow(null),
  IdAlmacenamiento: Joi.number().integer().optional().allow(null)
});

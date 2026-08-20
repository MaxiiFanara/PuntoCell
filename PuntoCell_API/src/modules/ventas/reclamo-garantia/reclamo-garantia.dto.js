import Joi from 'joi';

export const reclamoGarantiaSchema = Joi.object({
  FechaReclamo: Joi.date().required(),
  MotivoCliente: Joi.string().max(500).required(),
  Resolucion: Joi.string().max(500).optional().allow(null,''),
  IdDetalleVenta: Joi.number().integer().required(),
  IdEmpleado: Joi.number().integer().required(),
  IdEstadoReclamo: Joi.number().integer().required()
});

export const reclamoGarantiaUpdateSchema = Joi.object({
  FechaReclamo: Joi.date().optional(),
  MotivoCliente: Joi.string().max(500).optional(),
  Resolucion: Joi.string().max(500).optional().allow(null,''),
  IdDetalleVenta: Joi.number().integer().optional(),
  IdEmpleado: Joi.number().integer().optional(),
  IdEstadoReclamo: Joi.number().integer().optional()
});

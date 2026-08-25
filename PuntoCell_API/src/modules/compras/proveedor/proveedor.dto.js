import Joi from 'joi';

export const proveedorSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100).required(),
  Email: Joi.string().trim().lowercase().email().max(100).allow(null, '').optional(),
  Celular: Joi.string().max(20).allow(null, '').optional(),
  IdLocalidad: Joi.number().integer().positive().allow(null).optional()
});

export const proveedorUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100),
  Email: Joi.string().trim().lowercase().email().max(100).allow(null, ''),
  Celular: Joi.string().max(20).allow(null, ''),
  Activo: Joi.boolean(),
  IdLocalidad: Joi.number().integer().positive().allow(null)
});
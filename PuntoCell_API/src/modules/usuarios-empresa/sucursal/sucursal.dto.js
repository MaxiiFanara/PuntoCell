import Joi from 'joi';

const numeroCasa = Joi.string().pattern(/^([1-9]\d{0,3})$/).messages({ 'string.pattern.base': 'El número debe ser un entero entre 1 y 9999' });

export const sucursalSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100).required(),
  Calle: Joi.string().trim().lowercase().max(100).required(),
  Numero: numeroCasa.required(),
  Telefono: Joi.string().max(20).allow(null, '').optional(),
  IdLocalidad: Joi.number().integer().positive().required()
});

export const sucursalUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100),
  Calle: Joi.string().trim().lowercase().max(100),
  Numero: numeroCasa,
  Telefono: Joi.string().max(20).allow(null, ''),
  Activa: Joi.boolean(),
  IdLocalidad: Joi.number().integer().positive()
});
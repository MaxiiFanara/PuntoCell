import Joi from 'joi';
import { nombrePropio, dni, celular, numeroCasa, email, textoDireccion } from '../../../core/utils/joiCampos.js';

export const usuarioSchema = Joi.object({
  DNI: dni.required(),
  Apellido: nombrePropio.required(),
  Nombre: nombrePropio.required(),
  Email: email.required(),
  Celular: celular.required(),
  Calle: textoDireccion(100).allow(null, '').optional(),
  Numero: numeroCasa.allow(null, '').optional(),
  Piso: Joi.string().max(6).allow(null, '').optional(),
  Depto: Joi.string().max(6).allow(null, '').optional(),
  EsCliente: Joi.boolean().default(false),
  Pwd: Joi.string().min(6).max(255).allow(null, '').optional(),
  IdLocalidad: Joi.number().integer().positive().allow(null).optional(),
  // Opcionales acá, la lógica de negocio/BD verificará si son obligatorios siendo Empleado
  IdRol: Joi.number().integer().positive().allow(null).optional(),
  IdSucursal: Joi.number().integer().positive().allow(null).optional()
});

export const usuarioUpdateSchema = Joi.object({
  DNI: dni,
  Apellido: nombrePropio,
  Nombre: nombrePropio,
  Email: email,
  Celular: celular,
  Calle: textoDireccion(100).allow(null, ''),
  Numero: numeroCasa.allow(null, ''),
  Piso: Joi.string().max(6).allow(null, ''),
  Depto: Joi.string().max(6).allow(null, ''),
  EsCliente: Joi.boolean(),
  Pwd: Joi.string().min(6).max(255).allow(null, ''),
  Activo: Joi.boolean(),
  IdLocalidad: Joi.number().integer().positive().allow(null),
  IdRol: Joi.number().integer().positive().allow(null),
  IdSucursal: Joi.number().integer().positive().allow(null)
});

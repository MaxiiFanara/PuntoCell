import Joi from 'joi';

// Nombre, Email y Celular son obligatorios y únicos (ver proveedor.service.js para las
// validaciones de duplicado con mensaje de negocio limpio, y el índice único filtrado
// en Proveedor.Email/Celular en db/init/init.sql para la garantía a nivel de base).
export const proveedorSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100).required(),
  Email: Joi.string().trim().lowercase().email().max(100).required(),
  Celular: Joi.string().max(20).required(),
  IdLocalidad: Joi.number().integer().positive().allow(null).optional()
});

// Update parcial: cada campo sigue siendo opcional (no hace falta reenviar todo el
// objeto), pero si se manda Nombre/Email/Celular no se puede vaciar a null/'' — son
// obligatorios por diseño, no tendría sentido dejarlos en blanco a mitad de camino.
export const proveedorUpdateSchema = Joi.object({
  Nombre: Joi.string().trim().lowercase().min(2).max(100),
  Email: Joi.string().trim().lowercase().email().max(100),
  Celular: Joi.string().max(20),
  Activo: Joi.boolean(),
  IdLocalidad: Joi.number().integer().positive().allow(null)
});
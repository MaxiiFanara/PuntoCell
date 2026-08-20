import Joi from 'joi';

// Fragmentos Joi reutilizables para campos que se repiten entre módulos

// Nombre/Apellido de persona: solo letras (con acentos/ñ) y espacios, hasta 25 caracteres.
export const nombrePropio = Joi.string().trim().lowercase().max(25)
  .pattern(/^[A-Za-zÁÉÍÓÚÑÜáéíóúñüÀ-ÖØ-öø-ÿ\s]+$/)
  .messages({ 'string.pattern.base': 'Solo se permiten letras y espacios' });

// DNI: solo dígitos, 7 u 8 caracteres.
export const dni = Joi.string().pattern(/^\d{7,8}$/)
  .messages({ 'string.pattern.base': 'El DNI debe tener 7 u 8 dígitos numéricos' });

// Celular: solo dígitos, 10 u 11 caracteres (código de área + número, sin signos).
export const celular = Joi.string().pattern(/^\d{10,11}$/)
  .messages({ 'string.pattern.base': 'El celular debe tener 10 u 11 dígitos' });

// Número de casa: entero 1-9999 (la columna sigue siendo string en la BD).
export const numeroCasa = Joi.string().pattern(/^([1-9]\d{0,3})$/)
  .messages({ 'string.pattern.base': 'El número debe ser un entero entre 1 y 9999' });

// Email: se guarda tal cual en minúsculas, sin capitalizar al mostrar.
export const email = Joi.string().trim().lowercase().email().max(100);

// Texto libre "tipo dirección" (Calle, Localidad, etc.): trim + minúsculas al guardar,
// la capitalización es solo de presentación en el frontend.
export const textoDireccion = (max = 100) => Joi.string().trim().lowercase().max(max);

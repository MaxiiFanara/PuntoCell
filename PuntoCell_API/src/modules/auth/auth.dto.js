import Joi from 'joi';

export const loginSchema = Joi.object({
  Identificador: Joi.string().required(), 
  Pwd: Joi.string().required(),
  // Declarado para que stripUnknown no lo elimine; su obligatoriedad la
  // controla verifyRecaptcha (se puede desactivar con RECAPTCHA_ENABLED=false).
  RecaptchaToken: Joi.string()
});

export const forgotPasswordSchema = Joi.object({
  Email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  Token: Joi.string().required(),
  NewPassword: Joi.string().min(8).required()
});
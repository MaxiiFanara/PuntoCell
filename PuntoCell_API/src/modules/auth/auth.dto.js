import Joi from 'joi';

export const loginSchema = Joi.object({
  Identificador: Joi.string().required(), 
  Pwd: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  Email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  Token: Joi.string().required(),
  NewPassword: Joi.string().min(8).required()
});
import Joi from 'joi';

export const asistenteChatSchema = Joi.object({
  mensaje: Joi.string().trim().min(3).required(),
  historial: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      text: Joi.string().trim().min(1).required()
    }).unknown(true)
  ).max(12).optional(),
  contexto: Joi.alternatives().try(
    Joi.object().unknown(true),
    Joi.string()
  ).optional(),
  modelo: Joi.string().trim().optional()
});
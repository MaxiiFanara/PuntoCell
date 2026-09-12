import Joi from 'joi';

export const reparacionesQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  granularity: Joi.string().valid('day','week','month','year').optional(),
  productoId: Joi.number().integer().optional(),
  marcaId: Joi.number().integer().optional(),
  fallaId: Joi.number().integer().optional(),
  top: Joi.number().integer().optional(),
  days: Joi.number().integer().optional(),
  leadTimeDays: Joi.number().integer().optional()
});

export default reparacionesQuerySchema;

import Joi from 'joi';

export const comprasDateRangeSchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  proveedor: Joi.number().integer().optional(),
  productoId: Joi.number().integer().optional(),
  granularity: Joi.string().valid('day','week','month','year').optional(),
  top: Joi.number().integer().optional(),
  threshold: Joi.number().optional(),
  order: Joi.string().valid('monto','cantidad','frecuencia','precio').optional(),
  leadTimeDays: Joi.number().integer().min(0).optional(),
  serviceLevel: Joi.number().min(0.5).max(0.999).optional(),
  orderingCost: Joi.number().optional(),
  holdingCost: Joi.number().optional(),
  holdingCostPercent: Joi.number().min(0).max(1).optional(),
  unitCost: Joi.number().optional()
});

export default comprasDateRangeSchema;

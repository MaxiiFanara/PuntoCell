import Joi from 'joi';

export const dashboardQuerySchema = Joi.object({
  from: Joi.date().optional(),
  to: Joi.date().optional()
}).unknown(true);

export const paretoQuerySchema = Joi.object({
  from: Joi.date().optional(),
  to: Joi.date().optional()
}).unknown(true);

export const scatterQuerySchema = Joi.object({
  from: Joi.date().optional(),
  to: Joi.date().optional()
}).unknown(true);

export const elasticityQuerySchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().required()
}).unknown(true);

export const projectionQuerySchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().required()
}).unknown(true);

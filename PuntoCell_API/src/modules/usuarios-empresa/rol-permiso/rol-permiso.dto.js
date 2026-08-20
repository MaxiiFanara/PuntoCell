import Joi from 'joi';

export const rolPermisoSchema = Joi.object({
  IdRol: Joi.number().integer().positive().required(),
  IdPermiso: Joi.number().integer().positive().required()
});
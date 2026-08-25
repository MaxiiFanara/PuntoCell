import Joi from 'joi';

export const seguimientoOrdenSchema = Joi.object({
  FechaModificacion: Joi.date().iso().optional(),
  ObservacionTecnico: Joi.string().allow(null, '').optional(),
  IdOrdenReparacion: Joi.number().integer().positive().required(),
  IdEmpleado: Joi.number().integer().positive().required(),
  IdEstadoOrden: Joi.number().integer().positive().required()
});

export const seguimientoOrdenUpdateSchema = Joi.object({
  FechaModificacion: Joi.date().iso(),
  ObservacionTecnico: Joi.string().allow(null, ''),
  IdOrdenReparacion: Joi.number().integer().positive(),
  IdEmpleado: Joi.number().integer().positive(),
  IdEstadoOrden: Joi.number().integer().positive()
});
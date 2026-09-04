import Joi from 'joi';

export const bitacoraSchema = Joi.object({
	Detalle: Joi.string().optional().allow(null, ''),
	IpAddress: Joi.string().max(50).optional().allow(null, ''),
	Fecha: Joi.date().optional(),
	IdEmpleado: Joi.number().integer().optional().allow(null),
	IdSucursal: Joi.number().integer().optional().allow(null),
	Accion: Joi.string().max(150).required()
});

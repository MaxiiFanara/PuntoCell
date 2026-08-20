import Joi from 'joi';

const detalleSchema = Joi.object({
  Cantidad: Joi.number().integer().greater(0).required(),
  PrecioUnitario: Joi.number().precision(2).min(0).required(),
  IdArticulo: Joi.number().integer().required()
}).unknown(true); // Permite campos extra sin dar error

const pagoSchema = Joi.object({
  IdMetodoPago: Joi.number().integer().required(),
  Monto: Joi.number().precision(2).greater(0).required(),
  Cotizacion: Joi.number().precision(2).optional(),
  Observacion: Joi.string().optional().allow(null, '')
}).unknown(true);

export const ventaSchema = Joi.object({
  Fecha: Joi.date().required(),
  TotalVenta: Joi.number().precision(2).min(0).required(),
  TotalVentaARS: Joi.number().precision(2).min(0).required(),
  TotalCosto: Joi.number().precision(2).min(0).required(),
  Observaciones: Joi.string().optional().allow(null,''),
  EstadoPago: Joi.boolean().optional(),
  IdTurnoCaja: Joi.number().integer().required(),
  IdCliente: Joi.number().integer().required(),
  IdEmpleado: Joi.number().integer().required(),
  IdCotizacionDolar: Joi.number().integer().required(),
  IdDescuento: Joi.number().integer().optional().allow(null),
  Detalles: Joi.array().items(detalleSchema).min(1).required(),
  Pagos: Joi.array().items(pagoSchema).optional() // 🔥 AHORA ACEPTA PAGOS
}).unknown(true); // 🔥 IGNORA CAMPOS EXTRA COMO IdSucursal

export const ventaUpdateSchema = Joi.object({
  Fecha: Joi.date().optional(),
  TotalVenta: Joi.number().precision(2).min(0).optional(),
  TotalVentaARS: Joi.number().precision(2).min(0).optional(),
  TotalCosto: Joi.number().precision(2).min(0).optional(),
  Observaciones: Joi.string().optional().allow(null,''),
  EstadoPago: Joi.boolean().optional(),
  IdTurnoCaja: Joi.number().integer().optional(),
  IdCliente: Joi.number().integer().optional(),
  IdEmpleado: Joi.number().integer().optional(),
  IdCotizacionDolar: Joi.number().integer().optional(),
  IdDescuento: Joi.number().integer().optional().allow(null),
  Detalles: Joi.array().items(detalleSchema).optional(),
  Pagos: Joi.array().items(pagoSchema).optional()
}).unknown(true);
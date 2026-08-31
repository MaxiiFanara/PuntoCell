import Joi from 'joi';

// POST = "RegistrarPagoPosterior": paga (total o parcialmente) el saldo pendiente de
// una Compra ya existente. No hay UpdateSchema — un pago registrado es inmutable
// (PUT/DELETE fueron retirados, ver pago-compra.controller.js/.service.js).
export const pagoCompraSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).required(),
  FechaPago: Joi.date().iso().optional(),
  IdCompra: Joi.number().integer().positive().required(),
  IdMetodoPago: Joi.number().integer().positive().required(),
  IdTurnoCaja: Joi.number().integer().positive().required()
});
import Joi from 'joi';

// POST = registrar un pago (total o parcial) contra el saldo pendiente de una Compra
// existente. No hay update schema: un pago registrado es inmutable (sin PUT/DELETE).
export const pagoCompraSchema = Joi.object({
  Monto: Joi.number().precision(2).greater(0).required(),
  FechaPago: Joi.date().iso().optional(),
  IdCompra: Joi.number().integer().positive().required(),
  IdMetodoPago: Joi.number().integer().positive().required(),
  IdTurnoCaja: Joi.number().integer().positive().required()
});

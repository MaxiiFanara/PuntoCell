import Joi from 'joi';

// Renglón de compra: o bien referencia un Inventario existente (se le incrementa el Stock)
// o crea uno nuevo a partir de IdArticulo (+ atributos). Las reglas finas que dependen de
// datos de la base (IdArticulo requerido si no hay IdInventario, IMEIs si el producto es
// serializado, MesesGarantiaLocal al crear un renglón nuevo) se validan en compra.service.js.
const detalleCompraItemSchema = Joi.object({
  IdInventario: Joi.number().integer().positive().allow(null).optional(),
  IdArticulo: Joi.number().integer().positive().optional(),
  Cantidad: Joi.number().integer().min(1).required(),
  PrecioCostoUnitario: Joi.number().precision(2).min(0).required(),
  IdColor: Joi.number().integer().positive().allow(null).optional(),
  IdMemoria: Joi.number().integer().positive().allow(null).optional(),
  IdBateria: Joi.number().integer().positive().allow(null).optional(),
  IdAlmacenamiento: Joi.number().integer().positive().allow(null).optional(),
  MesesGarantiaMarca: Joi.date().allow(null).optional(),
  MesesGarantiaLocal: Joi.date().optional(),
  Observaciones: Joi.string().max(500).allow(null, '').optional(),
  IMEIs: Joi.array().items(Joi.string().trim().max(50)).optional()
}).unknown(true);

// Pago inicial cargado junto con la compra (contado / parcial). IdTurnoCaja no va acá:
// es único para toda la compra (ver compraSchema).
const pagoInicialSchema = Joi.object({
  IdMetodoPago: Joi.number().integer().positive().required(),
  Monto: Joi.number().precision(2).greater(0).required(),
  FechaPago: Joi.date().iso().optional()
}).unknown(true);

export const compraSchema = Joi.object({
  Fecha: Joi.date().iso().optional(),
  IdProveedor: Joi.number().integer().positive().required(),
  IdSucursalDestino: Joi.number().integer().positive().required(),
  IdEmpleado: Joi.number().integer().positive().required(),
  // Opcional en Joi (una compra 100% a crédito no lo necesita); el service lo exige
  // solo si se manda al menos un pago inicial.
  IdTurnoCaja: Joi.number().integer().positive().optional(),
  Detalles: Joi.array().items(detalleCompraItemSchema).min(1).required(),
  Pagos: Joi.array().items(pagoInicialSchema).optional()
});

export const compraUpdateSchema = Joi.object({
  Fecha: Joi.date().iso(),
  IdProveedor: Joi.number().integer().positive(),
  IdSucursalDestino: Joi.number().integer().positive(),
  IdEmpleado: Joi.number().integer().positive()
});

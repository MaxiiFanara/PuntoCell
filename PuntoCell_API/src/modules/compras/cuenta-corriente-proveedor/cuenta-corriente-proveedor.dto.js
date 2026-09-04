import Joi from 'joi';

// El frontend NO define Concepto, Debe/Haber crudos ni SaldoAcumulado: solo pide un
// ajuste manual indicando si suma o resta deuda y por cuánto. El resto lo arma el backend.
export const ajusteCuentaProveedorSchema = Joi.object({
  tipo: Joi.string().valid('debe', 'haber').required(), // debe = suma deuda, haber = la reduce
  Monto: Joi.number().precision(2).greater(0).required(),
  Detalle: Joi.string().trim().max(60).allow(null, '').optional()
});

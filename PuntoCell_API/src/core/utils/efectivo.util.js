// Los cobros y pagos en efectivo se operan siempre en importes enteros (se redondea al
// entero más cercano). Los demás medios de pago conservan sus centavos.
export const esMetodoEfectivo = async (models, idMetodoPago, transaction = null) => {
  const { MetodoPago } = models || {};
  if (!MetodoPago || !idMetodoPago) return false;
  const metodo = await MetodoPago.findByPk(idMetodoPago, { transaction });
  return String(metodo?.Nombre || '').trim().toLowerCase() === 'efectivo';
};

// Si el redondeo diera 0 (monto < 0,50) se conserva el importe original para no anularlo.
export const montoEfectivo = (monto) => {
  const entero = Math.round(Number(monto) || 0);
  return entero > 0 ? entero : Number(monto) || 0;
};

// En efectivo los importes se operan siempre enteros (redondeo al entero más cercano).
// Los demás medios de pago conservan sus centavos.
export const esEfectivoNombre = (nombre) => /efectivo/i.test(nombre || '');

// Si el redondeo diera 0 (monto < 0,50) se conserva el importe original para no anularlo.
export const redondearEfectivo = (monto) => {
  const entero = Math.round(Number(monto) || 0);
  return entero > 0 ? entero : Number(monto) || 0;
};

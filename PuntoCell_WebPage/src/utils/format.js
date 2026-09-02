// ============================================================
//  FORMATEO DE PRESENTACIÓN (frontend)
//  El dato se guarda en minúsculas/trim en el backend; esto es solo
//  cosmético para listados — nunca se manda de vuelta al servidor.
// ============================================================

import { soloDecimalNoNegativo } from './validators';

// "juan perez" -> "Juan Perez". No toca acentos/ñ ni asume separador fijo.
export const capitalizar = (valor) => {
  if (!valor) return valor;
  return String(valor)
    .split(' ')
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(' ');
};

// ============================================================
//  SEPARADORES DE MILES EN INPUTS NUMÉRICOS — puramente visual.
//  El valor "crudo" (el que vive en el state y viaja al backend) sigue siendo el de
//  siempre: dígitos + un único "." como separador decimal (mismo contrato que ya usa
//  soloDecimalNoNegativo en utils/validators.js). Estas dos funciones son la ÚNICA
//  conversión entre ese crudo y lo que el usuario ve/tipea (con "." de miles y ","
//  decimal, la misma convención es-AR que ya usan Money.jsx y toLocaleString en el
//  resto de la app) — no duplicar este regex en cada pantalla, usar <NumberField>.
// ============================================================

// crudo "1000000.5" -> visual "1.000.000,5". "1000." (el usuario recién tipeó el
// punto decimal) -> "1.000," para no trabarle la edición.
export const formatearMiles = (crudo) => {
  if (crudo === '' || crudo == null) return '';
  const [entero, decimal] = String(crudo).split('.');
  const enteroFormateado = (entero || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal === undefined ? enteroFormateado : `${enteroFormateado},${decimal}`;
};

// Inversa de formatearMiles: lo que el usuario tipeó/ve -> el crudo de siempre.
// Reutiliza soloDecimalNoNegativo para la sanitización final (un solo "." decimal,
// sin negativos) en vez de reimplementarla acá.
export const limpiarMiles = (visual) => {
  if (visual === '' || visual == null) return '';
  const sinMiles = String(visual).replace(/\./g, '').replace(',', '.');
  return soloDecimalNoNegativo(sinMiles);
};

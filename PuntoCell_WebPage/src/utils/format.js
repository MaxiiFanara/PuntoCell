// ============================================================
//  FORMATEO DE PRESENTACIÓN (frontend)
//  El dato se guarda en minúsculas/trim en el backend; esto es solo
//  cosmético para listados — nunca se manda de vuelta al servidor.
// ============================================================

// "juan perez" -> "Juan Perez". No toca acentos/ñ ni asume separador fijo.
export const capitalizar = (valor) => {
  if (!valor) return valor;
  return String(valor)
    .split(' ')
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(' ');
};

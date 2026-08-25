// Filtran el valor tecleado en el propio onChange; no reemplazan la validación del backend.

// Nombre / Apellido: solo letras y espacios (con acentos y ñ), hasta `max` caracteres.
export const soloLetrasYEspacios = (valor, max = 25) =>
  valor.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]/g, '').slice(0, max);

// DNI y similares: solo dígitos, hasta `max` caracteres.
export const soloDigitos = (valor, max) =>
  valor.replace(/\D/g, '').slice(0, max);

// Precios/montos: solo dígitos y un único punto decimal, nunca negativos.
export const soloDecimalNoNegativo = (valor) => {
  let limpio = valor.replace(/[^0-9.]/g, '');
  const primerPunto = limpio.indexOf('.');
  if (primerPunto !== -1) {
    limpio = limpio.slice(0, primerPunto + 1) + limpio.slice(primerPunto + 1).replace(/\./g, '');
  }
  return limpio;
};

// Entero positivo dentro de un rango (ej. "Número" de casa: 1-9999). Devuelve '' si el
// valor tecleado todavía no es un número completo (para no trabarle el borrado al usuario).
export const soloEnteroEnRango = (valor, min = 1, max = 9999) => {
  const soloDigitosVal = valor.replace(/\D/g, '');
  if (soloDigitosVal === '') return '';
  const num = Math.min(max, Math.max(min, parseInt(soloDigitosVal, 10)));
  return String(num);
};

// Handlers listos para usar directo en onChange={...} de un TextField controlado.
export const crearHandlerSoloLetras = (setForm, campo, max = 25) => (e) =>
  setForm((prev) => ({ ...prev, [campo]: soloLetrasYEspacios(e.target.value, max) }));

export const crearHandlerSoloDigitos = (setForm, campo, max) => (e) =>
  setForm((prev) => ({ ...prev, [campo]: soloDigitos(e.target.value, max) }));

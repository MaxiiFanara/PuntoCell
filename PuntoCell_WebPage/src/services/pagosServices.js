// ============================================================
//  CAPA DE SERVICIOS – PAGOS DEL CATÁLOGO (sin login)
// ============================================================

import { API_URL } from './api';

// No se usa fetchApi: descarta el cuerpo del error (y acá necesitamos el
// `detalle` del 409) y ante un 401 redirige a /login, que en una pantalla
// pública no corresponde.
const pedir = async (ruta, opciones = {}) => {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });

  const cuerpo = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(cuerpo.message || `Error ${res.status}`);
    err.status = res.status;
    err.detalle = cuerpo.detalle || [];
    throw err;
  }

  return cuerpo?.data ?? cuerpo;
};

export const pagosService = {
  crearCheckout: ({ items, comprador }) =>
    pedir('/pagos/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, comprador }),
    }),

  consultarPago: async (paymentId) => {
    try {
      return await pedir(`/pagos/${encodeURIComponent(paymentId)}`);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },
};

// Único punto del sistema que habla con la API de Mercado Pago. El resto del
// módulo no conoce sus URLs ni la forma de sus respuestas.
const BASE = 'https://api.mercadopago.com';

// fetchImpl se inyecta para poder chequear el módulo sin red (scripts/check-pagos.mjs).
export const crearMercadoPagoClient = ({ accessToken, fetchImpl = fetch }) => {
  const pedir = async (ruta, opciones = {}) => {
    const res = await fetchImpl(`${BASE}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...opciones.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      const cuerpo = await res.json().catch(() => ({}));
      throw new Error(cuerpo.message || `Mercado Pago respondió ${res.status}`);
    }

    return res.json();
  };

  return {
    crearPreferencia: (preferencia) =>
      pedir('/checkout/preferences', { method: 'POST', body: JSON.stringify(preferencia) }),

    obtenerPago: (paymentId) => pedir(`/v1/payments/${paymentId}`),
  };
};

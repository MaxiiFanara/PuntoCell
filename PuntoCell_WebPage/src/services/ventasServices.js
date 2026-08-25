import { fetchApi } from "./api";

export const ventasService = {

  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchApi(`/ventas?${query}`, {
      method: 'GET'
    });
    return response?.data || response || [];
  },

  getById: async (id) => {
    const response = await fetchApi(`/ventas/${id}`, {
      method: 'GET'
    });
    return response?.data || response;
  },

  create: async (payload) => {
    const response = await fetchApi('/ventas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response?.data || response;
  },

  getHistorico: async (filtros) => {
    const query = new URLSearchParams(filtros).toString();
    const response = await fetchApi(`/ventas/historico?${query}`, {
      method: 'GET'
    });
    return response?.data || response || [];
  },

  getMetodosPago: async () => {
    const response = await fetchApi('/finanzas/metodo-pagos', {
      method: 'GET'
    });
    return response?.data || response || [];
  },

  getCotizaciones: async () => {
    const response = await fetchApi('/ventas/cotizaciones', {
      method: 'GET'
    });
    return response?.data || response;
  },

  // Cotizacion es un historial: cada cambio agrega una fila, nunca pisa la anterior
  crearCotizacion: async (valor, clave = 'DolarBlue') => {
    const response = await fetchApi('/ventas/cotizaciones', {
      method: 'POST',
      body: JSON.stringify({ Clave: clave, Valor: valor })
    });
    return response?.data || response;
  },

  getCuotas: async () => {
    const response = await fetchApi('/ventas/cuotas', { method: 'GET' });
    return response?.data || response || [];
  },

  pagarCuota: async (idCuota, data) => {
    const response = await fetchApi(`/ventas/cuotas/${idCuota}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response?.data || response;
  },

  crearPago: async (data) => {
    const response = await fetchApi('/ventas/pagos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response?.data || response;
  }
};

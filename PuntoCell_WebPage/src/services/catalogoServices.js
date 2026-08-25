// ============================================================
//  CAPA DE SERVICIOS – CATÁLOGO PÚBLICO (sin login)
// ============================================================

import { fetchApi } from './api';

export const catalogoService = {
  getProductos: async (idSucursal = 1) => {
    const response = await fetchApi(`/catalogo/productos?IdSucursal=${idSucursal}`);
    return response?.data || response || { productos: [], cotizacionDolar: 0 };
  },
};

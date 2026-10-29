// ============================================================
//  CAPA DE SERVICIOS – CATÁLOGO PÚBLICO (sin login)
// ============================================================

import { fetchApi } from './api';

export const catalogoService = {
  // Sin idSucursal trae el inventario de TODAS las sedes. Filtrar por una sola
  // dejaba invisible el stock de la otra: el catálogo llegó a mostrar un equipo
  // como "sin stock" cuando había una unidad disponible en la otra sucursal.
  getProductos: async (idSucursal = null) => {
    const query = idSucursal ? `?IdSucursal=${idSucursal}` : '';
    const response = await fetchApi(`/catalogo/productos${query}`);
    return response?.data || response || { productos: [], cotizacionDolar: 0 };
  },

  // Productos del catálogo (2 o 3 ids) con la ficha técnica de cada modelo.
  comparar: async (ids) => {
    const response = await fetchApi(`/catalogo/comparar?ids=${ids.join(',')}`);
    return response?.data || response;
  },

  getCotizaciones: async () => {
    const response = await fetchApi('/catalogo/cotizaciones');
    return response?.data || response;
  },
};

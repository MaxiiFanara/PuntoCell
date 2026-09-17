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
};

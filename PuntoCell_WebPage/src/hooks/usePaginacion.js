import { useState } from 'react';

// Paginación client-side estándar del sistema: 10 filas por página.
// La paginación server-side (?page&limit) está rota en la API (base.dao.js), así que
// todas las tablas traen la lista completa y la cortamos acá.
export const FILAS_POR_PAGINA = 10;

export function usePaginacion(items, porPagina = FILAS_POR_PAGINA) {
  const lista = Array.isArray(items) ? items : [];
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  // Clamp en cada render: si la lista se achica (filtro), no quedamos en una página vacía.
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const itemsPagina = lista.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);

  return {
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    itemsPagina,
    total: lista.length,
    hayPaginacion: lista.length > porPagina,
  };
}

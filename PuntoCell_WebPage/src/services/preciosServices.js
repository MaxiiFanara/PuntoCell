// ============================================================
//  CAPA DE SERVICIOS – PRECIOS (ListaPrecio + PrecioArticulo)
// ============================================================
//  El modelo nuevo saca los precios de Inventario. Cada renglón de Inventario
//  tiene un historial de PrecioArticulo por ListaPrecio; el "vigente" es el de
//  FechaDesde más reciente con FechaHasta nula o futura.
//
//  Cálculo que hace la API (precios-articulos.service.js::computeFields):
//    CostoVariables = CostoBase * 0.26
//    CostoReal       = CostoBase + CostoVariables
//    ValorFinal      = CostoReal * (1 + PorcentajeRentabilidadLista / 100)
// ============================================================

import { fetchApi } from './api';

// Id de la lista default sembrada en init.sql (Lista General / Minorista).
export const LISTA_MINORISTA_ID = 1;

const soloArray = (res) => {
  const data = res?.data ?? res ?? [];
  return Array.isArray(data) ? data : (data?.rows ?? []);
};

export const preciosService = {
  // --- Listas de precios ---
  getListas: async () => soloArray(await fetchApi('/precios/lista-de-precios')),

  getLista: async (id) => {
    const res = await fetchApi(`/precios/lista-de-precios/${id}`);
    return res?.data ?? res;
  },

  crearLista: async (data) => {
    const res = await fetchApi('/precios/lista-de-precios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  actualizarLista: async (id, data) => {
    const res = await fetchApi(`/precios/lista-de-precios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  eliminarLista: (id) =>
    fetchApi(`/precios/lista-de-precios/${id}`, { method: 'DELETE' }),

  // --- Precios por artículo (renglón de inventario) ---
  getPreciosArticulos: async () => soloArray(await fetchApi('/precios/precios-articulos')),

  // La API solo recibe { IdInventario, IdListaPrecio, CostoBase, FechaDesde, FechaHasta? }
  // y calcula el resto.
  crearPrecio: async ({ IdInventario, IdListaPrecio, CostoBase, FechaDesde }) => {
    const res = await fetchApi('/precios/precios-articulos', {
      method: 'POST',
      body: JSON.stringify({
        IdInventario: Number(IdInventario),
        IdListaPrecio: Number(IdListaPrecio),
        CostoBase: Number(CostoBase),
        FechaDesde: FechaDesde || new Date().toISOString(),
      }),
    });
    return res?.data ?? res;
  },

  actualizarPrecio: async (id, data) => {
    const res = await fetchApi(`/precios/precios-articulos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  // Cierra un precio vigente poniéndole FechaHasta (la API todavía no lo hace sola
  // al crear el siguiente — ver plan, cambio A pendiente).
  cerrarPrecio: (id, fechaHasta = new Date().toISOString()) =>
    preciosService.actualizarPrecio(id, { FechaHasta: fechaHasta }),

  eliminarPrecio: (id) =>
    fetchApi(`/precios/precios-articulos/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
//  Helpers de resolución de precio vigente
// ---------------------------------------------------------------------------

const esVigente = (p, ahora) => {
  if (!p.FechaHasta) return true;
  return new Date(p.FechaHasta).getTime() >= ahora;
};

// Devuelve { [IdInventario]: { [IdListaPrecio]: precioArticulo } } quedándose con
// el vigente de FechaDesde más reciente por combinación (inventario, lista).
export const mapVigentePorInventario = (precios = []) => {
  const ahora = Date.now();
  const mapa = {};
  for (const p of precios) {
    if (!esVigente(p, ahora)) continue;
    const inv = p.IdInventario;
    const lista = p.IdListaPrecio;
    mapa[inv] ??= {};
    const actual = mapa[inv][lista];
    if (!actual || new Date(p.FechaDesde).getTime() > new Date(actual.FechaDesde).getTime()) {
      mapa[inv][lista] = p;
    }
  }
  return mapa;
};

// Precio de venta (ValorFinal) vigente de un inventario en una lista dada.
export const valorFinalVigente = (mapa, idInventario, idLista = LISTA_MINORISTA_ID) => {
  const p = mapa?.[idInventario]?.[idLista];
  return p ? Number(p.ValorFinal) || 0 : 0;
};

// El PrecioArticulo vigente "más nuevo" de un inventario entre las listas indicadas
// (o entre todas si no se pasan). `incluir` / `excluir` son sets/arrays de IdListaPrecio.
export const precioVigenteEntreListas = (mapa, idInventario, { incluir, excluir } = {}) => {
  const porLista = mapa?.[idInventario];
  if (!porLista) return null;
  const inc = incluir ? new Set(incluir) : null;
  const exc = excluir ? new Set(excluir) : null;
  let mejor = null;
  for (const [lista, p] of Object.entries(porLista)) {
    const id = Number(lista);
    if (inc && !inc.has(id)) continue;
    if (exc && exc.has(id)) continue;
    if (!mejor || new Date(p.FechaDesde) > new Date(mejor.FechaDesde)) mejor = p;
  }
  return mejor;
};

// Ids de las ListaPrecio consideradas "mayoristas" (por nombre).
export const idsListasMayoristas = (listas = []) =>
  listas
    .filter((l) => /mayor/i.test(l.Nombre || '') && (l.Activo === true || l.Activo === 1))
    .map((l) => l.Id ?? l.id);

// Precio minorista / mayorista vigente de un inventario, resolviendo por cualquier lista
// que exista (no se hardcodea la lista Id 1): minorista = mejor precio vigente en una
// lista NO mayorista; mayorista = mejor en una lista mayorista, con fallback a minorista.
export const resolverPrecioInventario = (mapa, idInventario, listasMayoristas = []) => {
  const may = precioVigenteEntreListas(mapa, idInventario, { incluir: listasMayoristas });
  const min = precioVigenteEntreListas(mapa, idInventario, { excluir: listasMayoristas })
    || precioVigenteEntreListas(mapa, idInventario); // si solo hay precio en lista mayorista
  const minorista = min ? Number(min.ValorFinal) || 0 : 0;
  return {
    minorista,
    mayorista: may ? Number(may.ValorFinal) || 0 : minorista,
    costoReal: (min || may) ? Number((min || may).CostoReal) || 0 : 0,
    costoBase: (min || may) ? Number((min || may).CostoBase) || 0 : 0,
  };
};

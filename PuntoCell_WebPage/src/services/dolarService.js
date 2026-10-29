// ============================================================
//  DÓLAR OFICIAL (referencia) — dolarapi.com
// ============================================================
//  Solo lectura. NO persiste nada: no toca la tabla Cotizacion ni
//  la cotización operativa del sistema (esa se sigue cargando a
//  mano en el Navbar). Esto es un dato informativo para que el
//  operador vea el oficial del día.
//
//  dolarapi.com expone JSON con CORS abierto (access-control-allow-origin: *),
//  así que se consume directo desde el browser, sin proxy en la API.
//    GET https://dolarapi.com/v1/dolares/oficial
//    -> { moneda, casa, nombre, compra, venta, fechaActualizacion }
// ============================================================

const URL_OFICIAL = 'https://dolarapi.com/v1/dolares/oficial';
const TTL_MS = 10 * 60 * 1000; // 10 min

let _cache = null; // { data, expira }

// Devuelve { compra, venta, fechaActualizacion, nombre } o null si falla.
export const getDolarOficial = async ({ forzar = false } = {}) => {
  if (!forzar && _cache && Date.now() < _cache.expira) return _cache.data;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(URL_OFICIAL, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const j = await res.json();
    const compra = Number(j?.compra);
    const venta = Number(j?.venta);
    if (!Number.isFinite(compra) || !Number.isFinite(venta)) throw new Error('respuesta sin compra/venta');

    const data = {
      compra,
      venta,
      nombre: j?.nombre || 'Oficial',
      fechaActualizacion: j?.fechaActualizacion || null,
    };
    _cache = { data, expira: Date.now() + TTL_MS };
    return data;
  } catch (e) {
    // Si falla la red / la fuente, devolvemos el último valor cacheado (aunque
    // esté vencido) y si no hay nada, null. El componente decide si mostrarlo.
    return _cache?.data ?? null;
  }
};

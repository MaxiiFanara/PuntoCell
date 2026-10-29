import fs from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../core/config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = resolve(__dirname, '../../../data/specs-cache.json');

const BASE_URL = 'https://api.mobileapi.dev';
const TTL_ENCONTRADO_MS = 30 * 24 * 60 * 60 * 1000;
const TTL_NO_ENCONTRADO_MS = 24 * 60 * 60 * 1000;
// El plan gratuito permite 5 pedidos por minuto; se deja uno de margen.
const PEDIDOS_POR_MINUTO = 4;

// Secciones del detalle de mobileapi.dev que se conservan. Se descartan las
// imágenes en base64 (pesan cientos de KB) y los campos `*_parsed`, que vienen
// vacíos.
const SECCIONES = ['network', 'body', 'display', 'platform', 'memory', 'main_camera', 'selfie_camera', 'sound', 'comms', 'features', 'battery'];

const normalizar = (texto) => (texto || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Solo se pide la ficha de equipos; accesorios y repuestos no existen en la API.
const CATEGORIAS_CON_FICHA = ['smartphone', 'tablet'];

const limpiarDetalle = (detalle) => {
  const specs = {
    nombre: detalle.name,
    fabricante: detalle.manufacturer_name,
    descripcion: detalle.description || null,
    imagen: detalle.image_url || null,
  };
  for (const seccion of SECCIONES) {
    const origen = detalle[seccion];
    if (!origen) continue;
    specs[seccion] = Object.fromEntries(
      Object.entries(origen).filter(([clave, valor]) =>
        clave !== 'id' && !clave.endsWith('_parsed') && typeof valor === 'string' && valor.trim() !== ''
      )
    );
  }
  return specs;
};

// Solo lectura de la ficha técnica por modelo. Los datos vienen de mobileapi.dev
// y se guardan en un JSON local: el catálogo tiene ~30 modelos y el plan gratuito
// da 50 créditos al mes, así que cada modelo se consulta una sola vez (2 créditos:
// búsqueda + detalle) y se reutiliza hasta que vence. No toca la base de datos.
export default class EspecificacionesService {
  constructor() {
    this.cache = null;
    this.pedidosRecientes = [];
    this.escritura = Promise.resolve();
  }

  get habilitado() {
    return Boolean(env.SPECS.MOBILEAPI_KEY);
  }

  esComparable(categoria) {
    return CATEGORIAS_CON_FICHA.includes(normalizar(categoria));
  }

  async cargarCache() {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    } catch {
      this.cache = { modelos: {}, uso: { mes: '', creditos: 0 } };
    }
    return this.cache;
  }

  // Escritura atómica (archivo temporal + rename) y serializada: dos pedidos
  // simultáneos no pisan ni dejan el JSON a medio escribir.
  guardarCache() {
    this.escritura = this.escritura.then(async () => {
      await fs.mkdir(dirname(CACHE_FILE), { recursive: true });
      const tmp = `${CACHE_FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.cache));
      await fs.rename(tmp, CACHE_FILE);
    }).catch((err) => console.warn('[specs] no se pudo guardar el caché:', err.message));
    return this.escritura;
  }

  // Tope mensual de créditos. Si se agotó no tiene sentido esperar.
  hayCupoMensual(cache, creditos) {
    const mes = new Date().toISOString().slice(0, 7);
    if (cache.uso.mes !== mes) cache.uso = { mes, creditos: 0 };
    return cache.uso.creditos + creditos <= env.SPECS.MOBILEAPI_MONTHLY_LIMIT;
  }

  // Tope por minuto: en vez de fallar, espera a que la ventana de 60 s libere
  // lugar (dos comparaciones seguidas con modelos nuevos superan los 4 pedidos).
  async esperarTurno(creditos) {
    for (;;) {
      const ahora = Date.now();
      this.pedidosRecientes = this.pedidosRecientes.filter((t) => ahora - t < 60_000);
      if (this.pedidosRecientes.length + creditos <= PEDIDOS_POR_MINUTO) return;
      const libera = this.pedidosRecientes[this.pedidosRecientes.length + creditos - PEDIDOS_POR_MINUTO - 1] + 60_000 - ahora;
      await new Promise((r) => setTimeout(r, Math.max(libera, 250)));
    }
  }

  async pedir(ruta, cache) {
    this.pedidosRecientes.push(Date.now());
    cache.uso.creditos += 1;
    const res = await fetch(`${BASE_URL}${ruta}`, {
      headers: { Authorization: `Bearer ${env.SPECS.MOBILEAPI_KEY}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`mobileapi.dev respondió ${res.status}`);
    return res.json();
  }

  // Devuelve { specs } con la ficha, o { specs: null, motivo } si no hay datos.
  // `motivo`: 'sin-clave' | 'no-encontrado' | 'cupo' | 'error'.
  async getFicha({ marca, modelo }) {
    if (!this.habilitado) return { specs: null, motivo: 'sin-clave' };
    if (!marca || !modelo) return { specs: null, motivo: 'no-encontrado' };

    const cache = await this.cargarCache();
    const clave = `${normalizar(marca)}|${normalizar(modelo)}`;
    const guardado = cache.modelos[clave];
    if (guardado && guardado.vence > Date.now()) {
      return guardado.specs ? { specs: guardado.specs } : { specs: null, motivo: 'no-encontrado' };
    }

    // Búsqueda + detalle = 2 créditos.
    if (!this.hayCupoMensual(cache, 2)) return { specs: null, motivo: 'cupo' };

    try {
      await this.esperarTurno(2);
      const busqueda = await this.pedir(
        `/devices/search/?name=${encodeURIComponent(modelo)}&manufacturer=${encodeURIComponent(marca)}`,
        cache
      );
      // Coincidencia exacta de nombre: "iPhone 15" no puede devolver "iPhone 15 Pro".
      const hallado = (busqueda.devices || []).find((d) => normalizar(d.name) === normalizar(modelo));

      let specs = null;
      if (hallado) {
        specs = limpiarDetalle(await this.pedir(`/devices/${hallado.id}/`, cache));
      }
      cache.modelos[clave] = { specs, vence: Date.now() + (specs ? TTL_ENCONTRADO_MS : TTL_NO_ENCONTRADO_MS) };
      await this.guardarCache();
      return specs ? { specs } : { specs: null, motivo: 'no-encontrado' };
    } catch (err) {
      console.warn('[specs] error consultando mobileapi.dev:', err.message);
      await this.guardarCache();
      return { specs: null, motivo: 'error' };
    }
  }
}

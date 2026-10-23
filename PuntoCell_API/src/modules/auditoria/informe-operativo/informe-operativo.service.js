import { Op } from 'sequelize';
import { env } from '../../../core/config/env.js';

// Informe técnico para el usuario analista. Lee SOLO la tabla Bitacora ya existente:
//  - Origen = 'SISTEMA' → logs técnicos de Winston (warn y error; los info no se persisten, ver LOG_DB_LEVEL).
//  - Origen = 'AUDITORIA' → únicamente los warn de login (sección "Seguridad y accesos").
// Las acciones funcionales de los usuarios (ventas, órdenes, etc.) NO forman parte del informe.

const MAX_EVENTOS = 5000;
const MAX_DIAS = 90;
const HORAS_VENTANA_DEFECTO = 24;
const HORA_MS = 3600 * 1000;
const DIA_MS = 24 * HORA_MS;
// Un error en estos módulos pasa directo a prioridad alta (afectan dinero). Ajustable.
const MODULOS_CRITICOS = new Set(['ventas', 'caja']);

export const REGLAS_ESTADO = [
  { id: 'critico_repetido', nivel: 'critico', texto: 'Algún error crítico (500) se repitió 5 o más veces' },
  { id: 'critico_modulos', nivel: 'critico', texto: 'Hay errores críticos (500) en 3 o más módulos distintos' },
  { id: 'critico_pico', nivel: 'critico', texto: 'Los errores críticos del período triplican a los del período anterior (mínimo 5)' },
  { id: 'atencion_error', nivel: 'atencion', texto: 'Hay al menos 1 error crítico (500)' },
  { id: 'atencion_warns', nivel: 'atencion', texto: 'Hay 10 o más advertencias del sistema' },
  { id: 'atencion_login', nivel: 'atencion', texto: 'Hay 20 o más intentos de login fallidos desde una misma IP' }
];

export const REGLAS_PRIORIDAD = {
  alta: 'Error crítico que se repitió 3 o más veces, que afecta a 2 o más usuarios, que trae un error de base de datos y no ocurrió en el período anterior, o que ocurre en un módulo crítico (' + [...MODULOS_CRITICOS].join(', ') + ')',
  media: 'Error crítico aislado, o advertencia que se repitió 5 o más veces',
  baja: 'Advertencias esporádicas'
};

const MODULOS_POR_TEXTO = [
  [/reCAPTCHA|login|sesión|contraseña|token/i, 'auth'],
  [/bitácora|bitacora|registerAudit/i, 'auditoria'],
  [/abandon|reparaci/i, 'reparaciones'],
  [/mercado ?pago|pago/i, 'pagos'],
  [/mail|correo|notificaci/i, 'notificaciones']
];

const parseDetalle = (detalle) => {
  if (!detalle) return {};
  try { const d = JSON.parse(detalle); return d && typeof d === 'object' ? d : {}; } catch { return {}; }
};

// "PATCH /api/reparaciones/ordenes-reparacion/275/estado: msg" → { metodo, ruta (IDs → :id), segmentos }
const extraerEndpoint = (accion) => {
  const m = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s:?]+)/.exec(accion ?? '');
  if (!m) return null;
  const ruta = m[2].split('/').map((seg) => (/^\d+$/.test(seg) ? ':id' : seg)).join('/');
  return { metodo: m[1], ruta, modulo: m[2].split('/')[2] ?? null };
};

// Devuelve el módulo y de dónde se dedujo (la tabla no tiene columna de módulo).
const inferirModulo = (accion, detalleObj, endpoint) => {
  if (endpoint?.modulo) return { modulo: endpoint.modulo, origen: 'ruta' };
  const mStack = /modules\/([a-z0-9-]+)\//i.exec(detalleObj.stack ?? '');
  if (mStack) return { modulo: mStack[1], origen: 'stack' };
  for (const [regex, modulo] of MODULOS_POR_TEXTO) if (regex.test(accion ?? '')) return { modulo, origen: 'texto' };
  return { modulo: 'sin clasificar', origen: null };
};

// Misma falla = mismo "fingerprint": se neutralizan números y textos entre comillas.
const huella = (nivel, accion) =>
  `${nivel}|${String(accion ?? '').replace(/"[^"]*"/g, '"…"').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase()}`;

const recortar = (txt, max) => (txt && txt.length > max ? `${txt.slice(0, max)}…` : txt ?? null);

export default class InformeOperativoService {
  constructor(bitacoraModel) {
    this.Bitacora = bitacoraModel;
  }

  _resolverPeriodo({ desde, hasta } = {}) {
    const to = hasta ? new Date(hasta) : new Date();
    const from = desde ? new Date(desde) : new Date(to.getTime() - HORAS_VENTANA_DEFECTO * HORA_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      const err = new Error('Las fechas "desde" y "hasta" no son válidas.'); err.statusCode = 400; throw err;
    }
    if (from >= to) {
      const err = new Error('"desde" debe ser anterior a "hasta".'); err.statusCode = 400; throw err;
    }
    if (to - from > MAX_DIAS * DIA_MS) {
      const err = new Error(`El período máximo es de ${MAX_DIAS} días.`); err.statusCode = 400; throw err;
    }
    const duracion = to - from;
    return { from, to, prevFrom: new Date(from.getTime() - duracion), prevTo: from };
  }

  async _contarPorNivel(from, to) {
    const rows = await this.Bitacora.findAll({
      where: { Origen: 'SISTEMA', Fecha: { [Op.gte]: from, [Op.lt]: to } },
      attributes: ['Nivel', [this.Bitacora.sequelize.fn('COUNT', '*'), 'n']],
      group: ['Nivel'],
      raw: true
    });
    const out = { info: 0, warn: 0, error: 0 };
    for (const r of rows) out[r.Nivel] = Number(r.n);
    out.total = out.info + out.warn + out.error;
    return out;
  }

  _agrupar(eventos, huellasPrevias) {
    const grupos = new Map();
    for (const ev of eventos) {
      const det = parseDetalle(ev.Detalle);
      const endpoint = extraerEndpoint(ev.Accion);
      const { modulo, origen } = inferirModulo(ev.Accion, det, endpoint);
      const key = huella(ev.Nivel, ev.Accion);
      let g = grupos.get(key);
      if (!g) {
        g = {
          clave: key, nivel: ev.Nivel, modulo, origenModulo: origen,
          endpoint: endpoint ? `${endpoint.metodo} ${endpoint.ruta}` : null,
          mensaje: ev.Accion, ocurrencias: 0, primera: ev.Fecha, ultima: ev.Fecha,
          _usuarios: new Set(), _sucursales: new Set(), _ips: new Set(),
          ejemplo: null
        };
        grupos.set(key, g);
      }
      g.ocurrencias += 1;
      if (ev.Fecha < g.primera) g.primera = ev.Fecha;
      if (ev.Fecha >= g.ultima) {
        g.ultima = ev.Fecha;
        g.ejemplo = {
          fecha: ev.Fecha, mensaje: ev.Accion,
          sqlMessage: det.sqlMessage ?? null,
          stack: recortar(det.stack, 1500)
        };
      }
      if (ev.IdEmpleado) g._usuarios.add(ev.IdEmpleado);
      if (ev.IdSucursal) g._sucursales.add(ev.IdSucursal);
      if (ev.IpAddress) g._ips.add(ev.IpAddress);
    }

    return [...grupos.values()].map((g) => {
      const nuevo = !huellasPrevias.has(g.clave);
      const usuarios = [...g._usuarios];
      const motivos = [];
      let prioridad = 'baja';
      if (g.nivel === 'error') {
        prioridad = 'media';
        if (g.ocurrencias >= 3) { prioridad = 'alta'; motivos.push(`se repitió ${g.ocurrencias} veces`); }
        if (usuarios.length >= 2) { prioridad = 'alta'; motivos.push(`afecta a ${usuarios.length} usuarios`); }
        if (nuevo && g.ejemplo?.sqlMessage) { prioridad = 'alta'; motivos.push('error con mensaje de base de datos'); }
        if (MODULOS_CRITICOS.has(g.modulo)) { prioridad = 'alta'; motivos.push(`módulo crítico (${g.modulo})`); }
        if (!motivos.length) motivos.push('error crítico aislado');
      } else if (g.ocurrencias >= 5) {
        prioridad = 'media'; motivos.push(`advertencia repetida ${g.ocurrencias} veces`);
      } else {
        motivos.push('advertencia esporádica');
      }
      const { _usuarios, _sucursales, _ips, ...resto } = g;
      return { ...resto, nuevo, usuariosAfectados: usuarios.slice(0, 5), cantidadUsuarios: usuarios.length, sucursales: [..._sucursales].slice(0, 5), ips: [..._ips].slice(0, 3), prioridad, motivos };
    }).sort((a, b) =>
      ({ alta: 0, media: 1, baja: 2 }[a.prioridad] - { alta: 0, media: 1, baja: 2 }[b.prioridad])
      || (a.nivel === b.nivel ? 0 : a.nivel === 'error' ? -1 : 1)
      || b.ocurrencias - a.ocurrencias
      || new Date(b.ultima) - new Date(a.ultima));
  }

  _porModulo(eventos) {
    const mapa = new Map();
    const huellasPorModulo = new Map();
    for (const ev of eventos) {
      const det = parseDetalle(ev.Detalle);
      const { modulo } = inferirModulo(ev.Accion, det, extraerEndpoint(ev.Accion));
      const m = mapa.get(modulo) ?? { modulo, eventos: 0, warns: 0, errores: 0, erroresRepetidos: 0, ultimoError: null };
      m.eventos += 1;
      if (ev.Nivel === 'error') {
        m.errores += 1;
        if (!m.ultimoError || ev.Fecha > m.ultimoError.fecha) m.ultimoError = { fecha: ev.Fecha, mensaje: recortar(ev.Accion, 140) };
        const hs = huellasPorModulo.get(modulo) ?? new Map();
        hs.set(huella(ev.Nivel, ev.Accion), (hs.get(huella(ev.Nivel, ev.Accion)) ?? 0) + 1);
        huellasPorModulo.set(modulo, hs);
      } else m.warns += 1;
      mapa.set(modulo, m);
    }
    for (const [modulo, hs] of huellasPorModulo) {
      mapa.get(modulo).erroresRepetidos = [...hs.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);
    }
    return [...mapa.values()].sort((a, b) => b.errores - a.errores || b.eventos - a.eventos);
  }

  _porRuta(eventos) {
    const mapa = new Map();
    for (const ev of eventos) {
      const ep = extraerEndpoint(ev.Accion);
      if (!ep) continue;
      const clave = `${ep.metodo} ${ep.ruta}`;
      const r = mapa.get(clave) ?? { ruta: clave, errores: 0, warns: 0, ultima: ev.Fecha };
      if (ev.Nivel === 'error') r.errores += 1; else r.warns += 1;
      if (ev.Fecha > r.ultima) r.ultima = ev.Fecha;
      mapa.set(clave, r);
    }
    return [...mapa.values()].sort((a, b) => (b.errores + b.warns) - (a.errores + a.warns)).slice(0, 15);
  }

  _linea(eventos, from, to, fechasLogin = []) {
    const porHora = (to - from) <= 3 * DIA_MS;
    const paso = porHora ? HORA_MS : DIA_MS;
    const inicio = Math.floor(from.getTime() / paso) * paso;
    const buckets = new Map();
    for (let t = inicio; t < to.getTime(); t += paso) buckets.set(t, { t: new Date(t).toISOString(), error: 0, warn: 0, login: 0 });
    for (const ev of eventos) {
      const b = buckets.get(Math.floor(new Date(ev.Fecha).getTime() / paso) * paso);
      if (b) b[ev.Nivel === 'error' ? 'error' : 'warn'] += 1;
    }
    for (const f of fechasLogin) {
      const b = buckets.get(Math.floor(new Date(f).getTime() / paso) * paso);
      if (b) b.login += 1;
    }
    return { unidad: porHora ? 'hora' : 'dia', puntos: [...buckets.values()] };
  }

  async _seguridad(from, to) {
    const rows = await this.Bitacora.findAll({
      where: { Origen: 'AUDITORIA', Nivel: 'warn', Accion: { [Op.like]: 'Login%' }, Fecha: { [Op.gte]: from, [Op.lt]: to } },
      attributes: ['Fecha', 'Accion', 'IpAddress'],
      order: [['Fecha', 'DESC']],
      limit: 2000,
      raw: true
    });
    const tipoDe = (a) => (/contraseña incorrecta/i.test(a) ? 'contraseñaIncorrecta' : /inexistente|inactivo/i.test(a) ? 'usuarioInexistente' : /recaptcha/i.test(a) ? 'captcha' : 'otro');
    const porTipo = { contraseñaIncorrecta: 0, usuarioInexistente: 0, captcha: 0, otro: 0 };
    const porIp = new Map();
    for (const r of rows) {
      const tipo = tipoDe(r.Accion);
      porTipo[tipo] += 1;
      const ip = (r.IpAddress ?? 'desconocida').replace('::ffff:', '');
      const x = porIp.get(ip) ?? { ip, total: 0, contraseñaIncorrecta: 0, usuarioInexistente: 0, captcha: 0, otro: 0, primera: r.Fecha, ultima: r.Fecha };
      x.total += 1; x[tipo] += 1;
      if (r.Fecha < x.primera) x.primera = r.Fecha;
      if (r.Fecha > x.ultima) x.ultima = r.Fecha;
      porIp.set(ip, x);
    }
    const ips = [...porIp.values()].sort((a, b) => b.total - a.total).slice(0, 10).map((x) => ({ ...x, sospechosa: x.total >= 5 }));
    return { total: rows.length, porTipo, ips, maxPorIp: ips[0]?.total ?? 0, fechas: rows.map((r) => r.Fecha) };
  }

  _estado(conteo, conteoPrev, grupos, seguridad) {
    const errores = grupos.filter((g) => g.nivel === 'error');
    const modulosConError = new Set(errores.map((g) => g.modulo).filter((m) => m !== 'sin clasificar'));
    const cumple = {
      critico_repetido: errores.some((g) => g.ocurrencias >= 5),
      critico_modulos: modulosConError.size >= 3,
      critico_pico: conteo.error >= 5 && conteo.error >= 3 * conteoPrev.error,
      atencion_error: conteo.error >= 1,
      atencion_warns: conteo.warn >= 10,
      atencion_login: seguridad.maxPorIp >= 20
    };
    const reglas = REGLAS_ESTADO.map((r) => ({ ...r, cumple: cumple[r.id] }));
    const estado = reglas.some((r) => r.nivel === 'critico' && r.cumple) ? 'critico'
      : reglas.some((r) => r.nivel === 'atencion' && r.cumple) ? 'atencion' : 'normal';
    return { estado, reglas };
  }

  async generar(query = {}) {
    const { from, to, prevFrom, prevTo } = this._resolverPeriodo(query);
    const atributos = ['Id', 'Fecha', 'Nivel', 'Accion', 'Detalle', 'IdEmpleado', 'IdSucursal', 'IpAddress'];
    const filtroEventos = (a, b) => ({ Origen: 'SISTEMA', Nivel: { [Op.in]: ['warn', 'error'] }, Fecha: { [Op.gte]: a, [Op.lt]: b } });

    const [conteo, conteoPrev, eventos, eventosPrev, seguridad] = await Promise.all([
      this._contarPorNivel(from, to),
      this._contarPorNivel(prevFrom, prevTo),
      this.Bitacora.findAll({ where: filtroEventos(from, to), attributes: atributos, order: [['Fecha', 'ASC']], limit: MAX_EVENTOS, raw: true }),
      this.Bitacora.findAll({ where: filtroEventos(prevFrom, prevTo), attributes: ['Nivel', 'Accion'], limit: MAX_EVENTOS, raw: true }),
      this._seguridad(from, to)
    ]);

    const huellasPrevias = new Set(eventosPrev.map((e) => huella(e.Nivel, e.Accion)));
    const grupos = this._agrupar(eventos, huellasPrevias);
    const modulos = this._porModulo(eventos);
    const { estado, reglas } = this._estado(conteo, conteoPrev, grupos, seguridad);
    const sinClasificar = eventos.length ? Math.round((eventos.filter((e) => {
      const det = parseDetalle(e.Detalle);
      return inferirModulo(e.Accion, det, extraerEndpoint(e.Accion)).modulo === 'sin clasificar';
    }).length / eventos.length) * 100) : 0;

    const truncado = eventos.length >= MAX_EVENTOS;
    const limitaciones = [
      `Solo se guardan en la base los logs técnicos de nivel ${env.LOG.DB_LEVEL} o superior (LOG_DB_LEVEL); los "info" técnicos no están disponibles en este informe.`,
      'La tabla no tiene columna de módulo: el módulo se deduce de la ruta, del stack o del texto del mensaje (aproximado).',
      'Rutas más consultadas, tiempos de respuesta y errores 4xx por ruta: información no disponible actualmente (no se registra cada petición).',
      'Los horarios del gráfico se agrupan en UTC.'
    ];
    if (sinClasificar > 0) limitaciones.push(`${sinClasificar}% de los eventos no pudo asignarse a un módulo.`);
    if (truncado) limitaciones.push(`Se analizaron los primeros ${MAX_EVENTOS} eventos del período; acote el rango para ver el detalle completo (los totales sí son exactos).`);

    return {
      generadoEn: new Date().toISOString(),
      periodo: { desde: from.toISOString(), hasta: to.toISOString() },
      periodoAnterior: { desde: prevFrom.toISOString(), hasta: prevTo.toISOString() },
      estado, reglasEstado: reglas, reglasPrioridad: REGLAS_PRIORIDAD,
      resumen: {
        sistema: conteo, sistemaAnterior: conteoPrev,
        gruposDeError: grupos.filter((g) => g.nivel === 'error').length,
        erroresNuevos: grupos.filter((g) => g.nivel === 'error' && g.nuevo).length,
        modulosConErrores: modulos.filter((m) => m.errores > 0).length
      },
      investigarPrimero: grupos.filter((g) => g.prioridad !== 'baja').slice(0, 5),
      grupos, modulos, rutas: this._porRuta(eventos),
      linea: this._linea(eventos, from, to, seguridad.fechas),
      seguridad: { ...seguridad, fechas: undefined }, sinClasificarPct: sinClasificar, truncado, limitaciones
    };
  }
}

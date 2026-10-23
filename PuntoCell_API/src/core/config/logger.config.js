import winston from 'winston';
import { env } from './env.js';

// Clave de metadata que NUNCA debe llegar a consola ni a la tabla Bitacora.
const CLAVE_SENSIBLE = /pass|pwd|token|jwt|cookie|authorization|secret|api[_-]?key|encryption/i;
const MAX_PROFUNDIDAD = 4;

function redactar(valor, profundidad = 0, vistos = new WeakSet()) {
  if (valor === null || typeof valor !== 'object') return valor;
  if (vistos.has(valor)) return '[Circular]';
  if (profundidad >= MAX_PROFUNDIDAD) return '[Truncado]';
  vistos.add(valor);

  if (Array.isArray(valor)) return valor.map((item) => redactar(item, profundidad + 1, vistos));

  const limpio = {};
  for (const [clave, v] of Object.entries(valor)) {
    limpio[clave] = CLAVE_SENSIBLE.test(clave) ? '[REDACTED]' : redactar(v, profundidad + 1, vistos);
  }
  return limpio;
}

// Winston descarta los argumentos extra que no son objetos (ej. logger.error('msg:', err.message)),
// que es justo cómo se usaba console.*. Se anexan al mensaje para no perder esa información.
const anexarArgumentos = winston.format((info) => {
  const extras = (info[Symbol.for('splat')] ?? []).filter((arg) => arg === null || typeof arg !== 'object');
  if (extras.length) info.message = `${info.message} ${extras.map(String).join(' ')}`;
  return info;
});

// Los errores de Sequelize traen `sql`, `parameters` y `parent/original` con los valores
// interpolados (pueden incluir hashes o datos personales): de ahí solo se conserva el mensaje.
const limpiarErrorSql = winston.format((info) => {
  const mensajeSql = info.original?.message ?? info.parent?.message;
  if (mensajeSql) info.sqlMessage = mensajeSql;
  delete info.original;
  delete info.parent;
  delete info.sql;
  delete info.parameters;
  return info;
});

const redactarSensibles = winston.format((info) => {
  for (const clave of Object.keys(info)) {
    if (clave === 'level' || clave === 'message' || clave === 'stack') continue;
    info[clave] = CLAVE_SENSIBLE.test(clave) ? '[REDACTED]' : redactar(info[clave]);
  }
  return info;
});

// Campos de contexto que el transporte guarda en columnas propias de Bitacora; el resto
// de la metadata (stack, sqlMessage, etc.) va serializada a Detalle.
const CAMPOS_CONTEXTO = new Set(['level', 'message', 'IdEmpleado', 'IdSucursal', 'Ip', 'timestamp']);
const esEntero = (n) => Number.isInteger(Number(n)) && Number(n) > 0;

// Transporte propio: Winston no trae uno para SQL Server. Escribe en la tabla Bitacora con
// Origen = 'SISTEMA' reutilizando el modelo Sequelize (misma conexión y mismo manejo de
// fechas que la auditoría de usuarios). Nunca debe romper ni demorar la operación que loguea.
class BitacoraTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this._ultimoAvisoFalla = 0;
  }

  log(info, callback) {
    // Fire-and-forget: el callback se invoca de inmediato, sin esperar a la base.
    this._guardar(info).catch((err) => this._avisarFalla(err));
    callback();
  }

  async _guardar(info) {
    // Import diferido: evita ciclos de carga (models -> ... -> logger) y que el logger
    // falle al importarse si la conexión todavía no está lista.
    const { models } = await import('../../models/index.js');

    const detalle = {};
    for (const [clave, valor] of Object.entries(info)) {
      if (!CAMPOS_CONTEXTO.has(clave) && typeof clave === 'string') detalle[clave] = valor;
    }

    await models.Bitacora.create({
      Accion: String(info.message ?? '').slice(0, 150) || '(sin mensaje)',
      Detalle: Object.keys(detalle).length ? JSON.stringify(detalle) : null,
      IpAddress: info.Ip ? String(info.Ip).slice(0, 50) : null,
      Fecha: new Date(),
      IdEmpleado: esEntero(info.IdEmpleado) ? Number(info.IdEmpleado) : null,
      IdSucursal: esEntero(info.IdSucursal) ? Number(info.IdSucursal) : null,
      Nivel: info.level,
      Origen: 'SISTEMA'
    });
  }

  // Sin volver a pasar por el logger (evita bucles). Como mucho un aviso por minuto.
  _avisarFalla(err) {
    const ahora = Date.now();
    if (ahora - this._ultimoAvisoFalla < 60_000) return;
    this._ultimoAvisoFalla = ahora;
    process.stderr.write(`[logger] No se pudo guardar el log en Bitacora: ${err?.message ?? err}\n`);
  }
}

const formatoConsola = winston.format.printf(({ level, message, stack, timestamp, ...resto }) => {
  const { IdEmpleado, IdSucursal, Ip, ...extra } = resto;
  const sufijo = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '';
  return `${timestamp} ${level}: ${message}${sufijo}${stack ? `\n${stack}` : ''}`;
});

export function createLoggerConfig() {
  const transports = [
    new winston.transports.Console({
      level: env.LOG.LEVEL,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        formatoConsola
      )
    })
  ];

  if (env.LOG.DB_ENABLED) {
    transports.push(new BitacoraTransport({ level: env.LOG.DB_LEVEL }));
  }

  return {
    levels: winston.config.npm.levels, // error: 0, warn: 1, info: 2
    level: env.LOG.LEVEL,
    exitOnError: false,
    format: winston.format.combine(
      anexarArgumentos(),
      winston.format.errors({ stack: true }),
      limpiarErrorSql(),
      redactarSensibles()
    ),
    transports
  };
}

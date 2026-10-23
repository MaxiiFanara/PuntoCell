import logger from './logger.js';

export async function registerAudit(bitacoraService, { detalle, Accion = null, IdEmpleado = null, IdSucursal = null, IpAddress = null, Fecha = new Date(), Nivel = 'info' } = {}) {
  if (!bitacoraService || typeof bitacoraService.create !== 'function') return null;

  // Accion es obligatoria (NOT NULL en la tabla): sin un texto que describa qué pasó
  // el registro no aporta nada, así que lo salteamos en vez de reventar el INSERT.
  if (!Accion) {
    logger.warn('registerAudit: llamada sin "Accion", se omite el registro de bitácora.');
    return null;
  }

  const bitacora = {
    Detalle: detalle ?? null,
    IpAddress: IpAddress || null,
    Fecha,
    IdEmpleado: IdEmpleado ?? null,
    IdSucursal: IdSucursal ?? null,
    Accion,
    Nivel,
    Origen: 'AUDITORIA'
  };

  try {
    return await bitacoraService.create(bitacora);
  } catch (err) {
    logger.error('registerAudit error:', err);
    return null;
  }
}

// Atajo para auditar desde un service: toma un auditContext { IdEmpleado, IdSucursal, Ip }
// (el que arman los controllers) + el texto de la acción y un detalle opcional.
export async function auditar(bitacoraService, ctx, Accion, detalle = null, Nivel = 'info') {
  return registerAudit(bitacoraService, {
    Accion,
    detalle,
    Nivel,
    IdEmpleado: ctx?.IdEmpleado ?? null,
    IdSucursal: ctx?.IdSucursal ?? null,
    IpAddress: ctx?.Ip ?? ctx?.IpAddress ?? null
  });
}

// ── Helpers para armar detalles legibles de bitácora (sin IDs técnicos) ──────────────────

// ['A'] -> 'A' · ['A','B'] -> 'A y B' · ['A','B','C'] -> 'A, B y C'
export function listaNatural(items = []) {
  const lista = items.filter(Boolean);
  if (lista.length <= 1) return lista[0] ?? '';
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

// Nombre del producto de cada renglón de inventario: ['Samsung A54', 'Funda x2'].
// Recibe renglones { IdInventario, Cantidad } y NUNCA lanza: si algo falla devuelve [] para que
// la auditoría no rompa (ni ensucie) la operación de negocio que ya se confirmó.
export async function nombresProductosDeInventario(sequelize, lineas = [], options = {}) {
  try {
    const { Inventario, Articulo } = sequelize.models;
    const idsInv = [...new Set(lineas.map((l) => l.IdInventario).filter(Boolean))];
    if (!idsInv.length) return [];

    const inventarios = await Inventario.findAll({ where: { Id: idsInv }, attributes: ['Id', 'IdArticulo'], ...options });
    const idArticuloPorInv = new Map(inventarios.map((i) => [i.Id, i.IdArticulo]));
    const articulos = await Articulo.findAll({
      where: { Id: [...new Set(idArticuloPorInv.values())] },
      attributes: ['Id', 'Nombre'],
      ...options
    });
    const nombrePorArticulo = new Map(articulos.map((a) => [a.Id, a.Nombre]));

    // Un mismo producto en varios renglones se agrupa sumando cantidades
    const cantidades = new Map();
    for (const l of lineas) {
      const nombre = nombrePorArticulo.get(idArticuloPorInv.get(l.IdInventario));
      if (!nombre) continue;
      cantidades.set(nombre, (cantidades.get(nombre) ?? 0) + (Number(l.Cantidad) || 1));
    }
    return [...cantidades].map(([nombre, cant]) => (cant > 1 ? `${nombre} (x${cant})` : nombre));
  } catch (err) {
    logger.warn(`No se pudieron resolver los nombres de productos para la bitácora: ${err.message}`);
    return [];
  }
}

export async function nombreSucursal(sequelize, idSucursal) {
  try {
    const sucursal = idSucursal ? await sequelize.models.Sucursal.findByPk(idSucursal, { attributes: ['Nombre'] }) : null;
    return sucursal?.Nombre ?? null;
  } catch (err) {
    logger.warn(`No se pudo resolver el nombre de la sucursal para la bitácora: ${err.message}`);
    return null;
  }
}

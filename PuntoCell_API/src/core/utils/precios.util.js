// Alta automática de precios para un renglón de Inventario. Lo usan tanto Compras
// (compra.service.js) como el alta directa de Inventario (canje / ingreso manual):
// cada renglón nuevo queda con su PrecioArticulo en TODAS las listas activas de su
// categoría (típicamente minorista + mayorista), todas con el mismo CostoBase.
// Cálculo idéntico a precios-articulos.service.js::computeFields.

export const FACTOR_COSTOS_VARIABLES = 0.26;

const round2 = (v) => Number(Number(v || 0).toFixed(2));

// Devuelve las ListaPrecio activas de una categoría (ordenadas por Id). Si la categoría
// no tiene ninguna activa, cae a la lista por defecto Id=1. Puede devolver [] sólo si
// tampoco existe la Id=1 (no debería pasar en una base sembrada).
export async function resolverListasPrecioCategoria(sequelize, idCategoria, t = null) {
  const { ListaPrecio } = sequelize.models;
  const opts = t ? { transaction: t } : {};

  let listas = idCategoria
    ? await ListaPrecio.findAll({
        where: { IdCategoriaProducto: idCategoria, Activo: true },
        order: [['Id', 'ASC']],
        ...opts
      })
    : [];

  if (!listas.length) {
    const fallback = await ListaPrecio.findByPk(1, opts);
    listas = fallback ? [fallback] : [];
  }
  return listas;
}

// Cierra los PrecioArticulo vigentes del renglón y crea uno nuevo por cada lista, todos
// con el mismo CostoBase; cada lista calcula su ValorFinal según su % de rentabilidad.
// No hace nada si no hay listas o el costo no es > 0. Devuelve los PrecioArticulo creados.
export async function reprecificarInventario(sequelize, { IdInventario, CostoBase, listas }, t = null) {
  const { PrecioArticulo } = sequelize.models;
  const opts = t ? { transaction: t } : {};

  if (!listas?.length || !(Number(CostoBase) > 0)) return [];

  const ahora = new Date();
  await PrecioArticulo.update(
    { FechaHasta: ahora },
    { where: { IdInventario, FechaHasta: null }, ...opts }
  );

  const base = round2(CostoBase);
  const cv = round2(base * FACTOR_COSTOS_VARIABLES);
  const cr = round2(base + cv);

  const creados = [];
  for (const lista of listas) {
    const pct = Number(lista.PorcentajeRentabilidad || 0);
    creados.push(await PrecioArticulo.create({
      IdInventario,
      IdListaPrecio: lista.Id,
      CostoBase: base,
      CostoVariables: cv,
      CostoReal: cr,
      PorcentajeGanancia: pct,
      ValorFinal: round2(cr * (1 + pct / 100)),
      FechaDesde: ahora,
      FechaHasta: null
    }, opts));
  }
  return creados;
}

// Cuando cambia el % de rentabilidad de una ListaPrecio, ningún PrecioArticulo debe quedar
// calculado con el % viejo: cierra TODOS los renglones vigentes de esa lista y crea uno
// nuevo por cada uno con el mismo CostoBase/CostoReal (el costo no cambió) pero el nuevo
// % y ValorFinal. Mismo patrón de historial que reprecificarInventario — nunca se pisa un
// registro. Devuelve los PrecioArticulo recreados (longitud = cuántos productos se vieron
// afectados). No hace nada si la lista no tiene ningún precio vigente todavía.
export async function repreciarPorLista(sequelize, { IdListaPrecio, PorcentajeRentabilidad }, t = null) {
  const { PrecioArticulo } = sequelize.models;
  const opts = t ? { transaction: t } : {};

  const vigentes = await PrecioArticulo.findAll({ where: { IdListaPrecio, FechaHasta: null }, ...opts });
  if (!vigentes.length) return [];

  const ahora = new Date();
  const pct = Number(PorcentajeRentabilidad || 0);

  await PrecioArticulo.update(
    { FechaHasta: ahora },
    { where: { IdListaPrecio, FechaHasta: null }, ...opts }
  );

  const nuevos = vigentes.map((p) => ({
    IdInventario: p.IdInventario,
    IdListaPrecio,
    CostoBase: p.CostoBase,
    CostoVariables: p.CostoVariables,
    CostoReal: p.CostoReal,
    PorcentajeGanancia: pct,
    ValorFinal: round2(Number(p.CostoReal) * (1 + pct / 100)),
    FechaDesde: ahora,
    FechaHasta: null
  }));

  return PrecioArticulo.bulkCreate(nuevos, opts);
}

// Alta automática de precios para un renglón de Inventario. Lo usan tanto Compras
// (compra.service.js) como el alta directa de Inventario (canje / ingreso manual):
// cada renglón nuevo queda con su PrecioArticulo en TODAS las listas activas de su
// categoría (típicamente minorista + mayorista), todas con el mismo CostoBase.
// Cálculo idéntico a precios-articulos.service.js::computeFields.



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

// Cierra los PrecioArticulo vigentes del renglón y crea uno nuevo por cada lista.
// CostoBase es el mismo para todas, pero el CostoVariables y ValorFinal se calculan
// individualmente usando el FactorCostosVariables y PorcentajeRentabilidad de cada lista.
export async function reprecificarInventario(sequelize, { IdInventario, CostoBase, listas, FijadoManual = false }, t = null) {
  const { PrecioArticulo } = sequelize.models;
  const opts = t ? { transaction: t } : {};

  if (!listas?.length || !(Number(CostoBase) > 0)) return [];

  const ahora = new Date();
  await PrecioArticulo.update(
    { FechaHasta: ahora },
    { where: { IdInventario, FechaHasta: null }, ...opts }
  );

  const base = round2(CostoBase);
  const creados = [];
  
  for (const lista of listas) {
    const factorCv = Number(lista.FactorCostosVariables || 0) / 100;
    const pct = Number(lista.PorcentajeRentabilidad || 0);
    
    const cv = round2(base * factorCv);
    const cr = round2(base + cv);

    creados.push(await PrecioArticulo.create({
      IdInventario,
      IdListaPrecio: lista.Id,
      CostoBase: base,
      CostoVariables: cv,
      CostoReal: cr,
      PorcentajeGanancia: pct,
      FijadoManual: !!FijadoManual,
      ValorFinal: round2(cr * (1 + pct / 100)),
      FechaDesde: ahora,
      FechaHasta: null
    }, opts));
  }
  return creados;
}

// Cuando cambia el % de rentabilidad o el factor de costos de una ListaPrecio:
// Cierra TODOS los renglones vigentes de esa lista y crea uno nuevo por cada uno.
export async function repreciarPorLista(sequelize, { IdListaPrecio, PorcentajeRentabilidad, FactorCostosVariables }, t = null) {
  const { PrecioArticulo } = sequelize.models;
  const opts = t ? { transaction: t } : {};

  const vigentes = await PrecioArticulo.findAll({ where: { IdListaPrecio, FechaHasta: null, FijadoManual: false }, ...opts });
  if (!vigentes.length) return [];

  const ahora = new Date();
  const pct = Number(PorcentajeRentabilidad || 0);
  const factorCv = Number(FactorCostosVariables || 0) / 100;

  await PrecioArticulo.update(
    { FechaHasta: ahora },
    { where: { IdListaPrecio, FechaHasta: null, FijadoManual: false }, ...opts }
  );

  const nuevos = vigentes.map((p) => {
    const base = Number(p.CostoBase);
    const cv = round2(base * factorCv);
    const cr = round2(base + cv);

    return {
      IdInventario: p.IdInventario,
      IdListaPrecio,
      CostoBase: base,
      CostoVariables: cv,
      CostoReal: cr,
      PorcentajeGanancia: pct,
      ValorFinal: round2(cr * (1 + pct / 100)),
      FechaDesde: ahora,
      FechaHasta: null
    };
  });

  return PrecioArticulo.bulkCreate(nuevos, opts);
}

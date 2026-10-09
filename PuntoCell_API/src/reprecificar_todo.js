import Database from './core/db/database.js';
import models, { sequelize } from './models/index.js';
import { reprecificarInventario, resolverListasPrecioCategoria } from './core/utils/precios.util.js';

async function run() {
  await Database.getInstance().connect();
  
  const inventarios = await models.Inventario.findAll({
    include: [{
      model: models.Articulo,
      as: 'articulo',
      include: [{ model: models.ModeloArticulo, as: 'modelo' }]
    }]
  });

  console.log(`Encontrados ${inventarios.length} items de inventario.`);
  let count = 0;

  for (const inv of inventarios) {
    // Buscar su costo base actual
    const precioVigente = await models.PrecioArticulo.findOne({
      where: { IdInventario: inv.Id, FechaHasta: null },
      order: [['FechaDesde', 'DESC']]
    });

    const costoBase = precioVigente ? Number(precioVigente.CostoBase) : 0;
    if (costoBase <= 0) continue; // Si no tiene costo base, no hacemos nada

    const fijadoManual = precioVigente ? precioVigente.FijadoManual : false;

    const idCat = inv.articulo?.modelo?.IdCategoriaArticulo;
    const listas = await resolverListasPrecioCategoria(sequelize, idCat);

    await reprecificarInventario(sequelize, {
      IdInventario: inv.Id,
      CostoBase: costoBase,
      FijadoManual: fijadoManual,
      listas
    });
    count++;
  }

  console.log(`Reprecificación completada para ${count} productos con costo base > 0.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

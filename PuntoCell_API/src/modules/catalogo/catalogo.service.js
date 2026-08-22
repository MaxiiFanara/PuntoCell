import { models } from '../../models/index.js';
import { Op } from 'sequelize';

// Servicio de solo lectura para el catálogo público (sin login). Expone
// exclusivamente los campos necesarios para mostrar un producto en la
// vitrina — nunca PrecioCosto, IdProveedor, IMEI ni ningún otro dato
// interno/sensible del negocio.
export default class CatalogoService {
  async getProductosVendibles({ IdSucursal, IdListaPrecio } = {}) {
    const where = {};
    if (IdSucursal) where.IdSucursal = Number(IdSucursal);

    const [inventario, cotizacion] = await Promise.all([
      models.Inventario.findAll({
        where,
        include: [{
          association: 'articulo',
          where: { EsVendible: true, Activo: true },
          required: true,
          attributes: ['Nombre', 'EsSerializado'],
          include: [{
            association: 'modelo',
            attributes: ['Nombre'],
            include: [{ association: 'marca', attributes: ['Nombre'] }]
          }]
        }, {
          association: 'color', attributes: ['Nombre']
        }, {
          association: 'memoria', attributes: ['Capacidad']
        }]
      }),
      models.Cotizacion.findAll({ order: [['CreatedAt', 'DESC']] })
    ]);

    const cotizacionDolar = Number(
      cotizacion.find((c) => (c.Clave || '').toLowerCase().includes('blue'))?.Valor
      ?? cotizacion[0]?.Valor
    ) || 0;

    // Determine price list to use: query param or active one
    let listaId = IdListaPrecio ? Number(IdListaPrecio) : undefined;
    if (!listaId) {
      const listaActiva = await models.ListaPrecio.findOne({ where: { Activo: true } });
      listaId = listaActiva?.Id || null;
    }

    // If no price list available, return products without prices
    const invIds = inventario.map((i) => i.Id);
    let preciosMap = {};
    if (listaId && invIds.length) {
      const now = new Date();
      const precios = await models.PrecioArticulo.findAll({
        where: {
          IdListaPrecio: listaId,
          IdInventario: { [Op.in]: invIds },
          FechaDesde: { [Op.lte]: now },
          [Op.or]: [ { FechaHasta: null }, { FechaHasta: { [Op.gte]: now } } ]
        },
        order: [['FechaDesde', 'DESC']]
      });

      // keep the most recent FechaDesde per IdInventario
      for (const p of precios) {
        if (!preciosMap[p.IdInventario]) preciosMap[p.IdInventario] = p;
      }
    }

    const productos = inventario
      .map((inv) => {
        const precio = preciosMap[inv.Id];
        const priceUsd = precio ? Number(precio.ValorFinal) || 0 : 0;
        return {
          id: String(inv.Id),
          name: inv.articulo?.Nombre || 'Producto',
          category: inv.articulo?.modelo?.Nombre || 'Dispositivos',
          marca: inv.articulo?.modelo?.marca?.Nombre || null,
          priceUsd,
          stock: inv.Stock || 0,
          esSerializado: !!inv.articulo?.EsSerializado,
          color: inv.color?.Nombre || null,
          memoria: inv.memoria?.Capacidad || null,
        };
      })
      .filter((p) => p.priceUsd > 0);

    return { productos, cotizacionDolar };
  }
}

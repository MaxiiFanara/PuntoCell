import { models } from '../../models/index.js';

// Servicio de solo lectura para el catálogo público (sin login). Expone
// exclusivamente los campos necesarios para mostrar un producto en la
// vitrina — nunca PrecioCosto, IdProveedor, IMEI ni ningún otro dato
// interno/sensible del negocio.
export default class CatalogoService {
  async getProductosVendibles({ IdSucursal } = {}) {
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

    const productos = inventario
      .filter((inv) => Number(inv.PrecioMenor) > 0)
      .map((inv) => ({
        id: String(inv.Id),
        name: inv.articulo?.Nombre || 'Producto',
        category: inv.articulo?.modelo?.Nombre || 'Dispositivos',
        marca: inv.articulo?.modelo?.marca?.Nombre || null,
        priceUsd: Number(inv.PrecioMenor) || 0,
        stock: inv.Stock || 0,
        esSerializado: !!inv.articulo?.EsSerializado,
        color: inv.color?.Nombre || null,
        memoria: inv.memoria?.Capacidad || null,
      }));

    return { productos, cotizacionDolar };
  }
}

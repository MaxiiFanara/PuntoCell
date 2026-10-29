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
            include: [
              { association: 'marca', attributes: ['Nombre'] },
              // Categoría real del producto (Celulares/Accesorios/etc. en la DB).
              // Antes el catálogo público agrupaba por nombre de MODELO, lo que
              // rompía el filtro de categorías del front (cada modelo era casi su
              // propia categoría). Cambio acotado a este include + al mapeo de
              // abajo; no toca modelos, asociaciones ni la base de datos.
              { association: 'categoria', attributes: ['Nombre'] },
            ]
          }, {
            association: 'imagenes',
            attributes: ['URLRelativa', 'EsPortada', 'OrdenVisual'],
            required: false
          }]
        }, {
          association: 'color', attributes: ['Nombre']
        }, {
          association: 'memoria', attributes: ['Capacidad']
        }, {
          association: 'bateria', attributes: ['Capacidad']
        }, {
          association: 'almacenamiento', attributes: ['Capacidad']
        }, {
          association: 'estado', attributes: ['Nombre']
        }, {
          // El inventario es por sucursal: el mismo producto puede existir en las
          // dos sedes como renglones distintos, con su propio stock. El catálogo
          // muestra de cuál viene cada uno para que el comprador lo sepa antes
          // de comprar. Solo el nombre: no se expone dirección ni nada interno.
          association: 'sucursal', attributes: ['Nombre']
        }]
      }),
      models.Cotizacion.findAll({ order: [['CreatedAt', 'DESC']] })
    ]);

    const cotizacionDolar = Number(
      cotizacion.find((c) => (c.Clave || '').toLowerCase().includes('blue'))?.Valor
      ?? cotizacion[0]?.Valor
    ) || 0;

    // Precio a mostrar: si viene IdListaPrecio se respeta; si no, el catálogo público
    // siempre muestra el MINORISTA — el precio vigente de cada renglón en cualquier lista
    // que NO sea mayorista (detectadas por nombre). Cada categoría tiene su lista
    // minorista y mayorista; acá nunca se expone la mayorista.
    const invIds = inventario.map((i) => i.Id);
    let preciosMap = {};
    if (invIds.length) {
      const now = new Date();
      const listas = await models.ListaPrecio.findAll();
      const idsMayoristas = new Set(
        listas.filter((l) => /mayor/i.test(l.Nombre || '')).map((l) => l.Id)
      );

      const where = {
        IdInventario: { [Op.in]: invIds },
        FechaDesde: { [Op.lte]: now },
        [Op.or]: [ { FechaHasta: null }, { FechaHasta: { [Op.gte]: now } } ]
      };
      if (IdListaPrecio) where.IdListaPrecio = Number(IdListaPrecio);

      const precios = await models.PrecioArticulo.findAll({ where, order: [['FechaDesde', 'DESC']] });

      // 1ª pasada: el más reciente de una lista NO mayorista (o de la lista pedida)
      for (const p of precios) {
        if (!IdListaPrecio && idsMayoristas.has(p.IdListaPrecio)) continue;
        const prev = preciosMap[p.IdInventario];
        if (!prev || new Date(p.FechaDesde) > new Date(prev.FechaDesde)) preciosMap[p.IdInventario] = p;
      }
      // 2ª pasada: si un renglón sólo tiene precio en lista mayorista, se usa igual
      if (!IdListaPrecio) {
        for (const p of precios) {
          if (!preciosMap[p.IdInventario]) preciosMap[p.IdInventario] = p;
        }
      }
    }

    const productos = inventario
      .map((inv) => {
        const precio = preciosMap[inv.Id];
        const priceUsd = precio ? Number(precio.ValorFinal) || 0 : 0;
        const imagenes = (inv.articulo?.imagenes || [])
          .sort((a, b) => (a.OrdenVisual || 99) - (b.OrdenVisual || 99));

        return {
          id: String(inv.Id),
          name: inv.articulo?.Nombre || 'Producto',
          modelo: inv.articulo?.modelo?.Nombre || null,
          categoria: inv.articulo?.modelo?.categoria?.Nombre || 'otros',
          marca: inv.articulo?.modelo?.marca?.Nombre || null,
          priceUsd,
          stock: inv.Stock || 0,
          esSerializado: !!inv.articulo?.EsSerializado,
          color: inv.color?.Nombre || null,
          memoria: inv.memoria?.Capacidad || null,
          bateria: inv.bateria?.Capacidad || null,
          imagenes: imagenes.map(img => img.URLRelativa),
          imagenPortada: imagenes.find(img => img.EsPortada)?.URLRelativa || imagenes[0]?.URLRelativa || null,
          almacenamiento: inv.almacenamiento?.Capacidad || null,
          estado: inv.estado?.Nombre || null,
          garantiaMarca: inv.MesesGarantiaMarca || null,
          garantiaLocal: inv.MesesGarantiaLocal || null,
          observaciones: inv.Observaciones || null,
          sucursal: inv.sucursal?.Nombre || null,
        };
      })
      .filter((p) => p.priceUsd > 0);

    return { productos, cotizacionDolar };
  }

  async getCotizaciones() {
    return await models.Cotizacion.findAll({ order: [['CreatedAt', 'DESC']] });
  }
}

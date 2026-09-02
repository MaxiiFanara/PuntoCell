

import { sequelize } from '../../../models/index.js';
import { auditar } from '../../../core/utils/audit.util.js';

export default class RepuestoOrdenService {
  constructor(repuestoOrdenDAO, ordenReparacionDAO, bitacoraService = null) {
    this.repuestoOrdenDAO = repuestoOrdenDAO;
    this.ordenReparacionDAO = ordenReparacionDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.repuestoOrdenDAO.getAll({ page, limit });
  }

  async getById(id) {
    const repuesto = await this.repuestoOrdenDAO.getById(id);
    if (!repuesto) {
      const err = new Error('Repuesto de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return repuesto;
  }

  async create(data, ctx = null) {
    const { IdOrdenReparacion, IdInventario, Cantidad } = data;
    const t = await sequelize.transaction();

    try {
      const orden = await this.ordenReparacionDAO.getById(IdOrdenReparacion);
      if (!orden) throw new Error('Orden de reparación no encontrada');
      if (orden.IdEstadoOrden !== 2) {
        const err = new Error('Solo se pueden agregar repuestos a órdenes en estado En Reparación.');
        err.statusCode = 400;
        throw err;
      }

      const inventario = await sequelize.models.Inventario.findByPk(IdInventario, { transaction: t });
      if (!inventario) throw new Error('Item de inventario no encontrado');
      if (inventario.Stock < Cantidad) {
        const err = new Error(`Stock insuficiente. Stock disponible: ${inventario.Stock}`);
        err.statusCode = 400;
        throw err;
      }

      const articulo = await sequelize.models.Articulo.findOne({
        where: { Id: inventario.IdArticulo, EsRepuesto: true, Activo: true },
        transaction: t
      });
      if (!articulo) {
        const err = new Error('El artículo seleccionado no es un repuesto o no está activo.');
        err.statusCode = 400;
        throw err;
      }

      await inventario.decrement('Stock', { by: Cantidad, transaction: t });

      // El precio de venta ya no vive en Inventario: se toma del PrecioArticulo vigente
      // (FechaHasta IS NULL) de ese renglón de inventario. Un mismo inventario suele tener
      // un vigente por lista (minorista + mayorista, creados casi al mismo instante), así
      // que NO alcanza con "el más reciente por fecha" — hay que elegir explícitamente el
      // de la lista minorista (regla de negocio: el repuesto se cobra a precio minorista
      // por defecto; este flujo todavía no tiene selector de mayorista).
      const vigentes = await sequelize.models.PrecioArticulo.findAll({
        where: { IdInventario, FechaHasta: null },
        include: [{ association: 'lista', attributes: ['Nombre'] }],
        transaction: t
      });
      if (!vigentes.length) {
        const err = new Error('El repuesto seleccionado no tiene un precio vigente cargado. Defina un PrecioArticulo antes de usarlo.');
        err.statusCode = 400;
        throw err;
      }
      const precioVigente = vigentes.find((p) => !/mayor/i.test(p.lista?.Nombre || '')) || vigentes[0];
      const precioCobrado = Number(precioVigente.ValorFinal || 0);
      const nuevoRepuesto = await this.repuestoOrdenDAO.create({
        Cantidad,
        PrecioCobrado: precioCobrado,
        IdOrdenReparacion,
        IdInventario
      }, { transaction: t });

      const nuevoCosto = Number(orden.CostoRepuestos) + (precioCobrado * Cantidad);
      await orden.update({ CostoRepuestos: nuevoCosto }, { transaction: t });

      await t.commit();

      await auditar(this.bitacoraService, ctx,
        `Agregó ${Cantidad} repuesto(s) a la orden de reparación #${IdOrdenReparacion} (repuesto #${nuevoRepuesto.Id})`,
        `Inventario ${IdInventario} · precio cobrado ${precioCobrado}`);

      return nuevoRepuesto;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async delete(id, ctx = null) {
    const t = await sequelize.transaction();

    try {
      const repuesto = await this.repuestoOrdenDAO.getById(id);
      if (!repuesto) {
        const err = new Error('Repuesto de orden no encontrado');
        err.statusCode = 404;
        throw err;
      }

      const orden = await this.ordenReparacionDAO.getById(repuesto.IdOrdenReparacion);
      if (orden.IdEstadoOrden !== 2) {
        const err = new Error('Solo se pueden quitar repuestos de órdenes en estado En Reparación.');
        err.statusCode = 400;
        throw err;
      }

      const inventario = await sequelize.models.Inventario.findByPk(repuesto.IdInventario, { transaction: t });
      if (inventario) {
        await inventario.increment('Stock', { by: repuesto.Cantidad, transaction: t });
      }

      const costoARestar = Number(repuesto.PrecioCobrado) * repuesto.Cantidad;
      const nuevoCosto = Math.max(0, Number(orden.CostoRepuestos) - costoARestar);
      await orden.update({ CostoRepuestos: nuevoCosto }, { transaction: t });

      await this.repuestoOrdenDAO.remove(id, { transaction: t });

      await t.commit();

      await auditar(this.bitacoraService, ctx,
        `Quitó un repuesto de la orden de reparación #${repuesto.IdOrdenReparacion} (repuesto #${id})`,
        `Se devolvieron ${repuesto.Cantidad} unidad(es) al stock`);

      return true;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getRepuestosDisponibles(query = {}) {
    const { IdCategoriaArticulo, IdMarcaArticulo } = query;

    return await sequelize.models.Inventario.findAll({
      where: sequelize.literal('Stock > 0'),
      include: [{
        model: sequelize.models.Articulo,
        as: 'articulo',
        where: { EsRepuesto: true, Activo: true },
        include: [{
          model: sequelize.models.ModeloArticulo,
          as: 'modelo',
          where: IdMarcaArticulo ? { IdMarcaArticulo } : {},
          include: [{
            model: sequelize.models.CategoriaArticulo,
            as: 'categoria',
            where: IdCategoriaArticulo ? { Id: IdCategoriaArticulo } : {}
          }, {
            model: sequelize.models.MarcaArticulo,
            as: 'marca'
          }]
        }]
      }]
    });
  }
}
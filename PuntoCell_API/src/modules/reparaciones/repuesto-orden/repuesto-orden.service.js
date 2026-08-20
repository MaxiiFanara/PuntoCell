

import { sequelize } from '../../../models/index.js';

export default class RepuestoOrdenService {
  constructor(repuestoOrdenDAO, ordenReparacionDAO) {
    this.repuestoOrdenDAO = repuestoOrdenDAO;
    this.ordenReparacionDAO = ordenReparacionDAO;
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

  async create(data) {
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

      const precioCobrado = Number(inventario.PrecioMenor || 0);
      const nuevoRepuesto = await this.repuestoOrdenDAO.create({
        Cantidad,
        PrecioCobrado: precioCobrado,
        IdOrdenReparacion,
        IdInventario
      }, { transaction: t });

      const nuevoCosto = Number(orden.CostoRepuestos) + (precioCobrado * Cantidad);
      await orden.update({ CostoRepuestos: nuevoCosto }, { transaction: t });

      await t.commit();
      return nuevoRepuesto;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async delete(id) {
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
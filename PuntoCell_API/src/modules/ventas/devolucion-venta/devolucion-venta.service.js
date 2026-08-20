export default class DevolucionVentaService {
  constructor(devolucionDAO, detalleDAO) {
    this.devolucionDAO = devolucionDAO;
    this.detalleDAO = detalleDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.devolucionDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const sequelize = this.devolucionDAO.model.sequelize;
    const Detalle = sequelize.models.DetalleDevolucionVenta;
    const item = await this.devolucionDAO.getById(id, { attributes: this.ATTRIBUTES, include: [ { model: Detalle, as: 'detalles' } ] });
    if (!item) throw new Error('DevolucionVenta no encontrada');
    return item;
  }

  async create(data) {
    const sequelize = this.devolucionDAO.model.sequelize;
    const t = await sequelize.transaction();
    let devolData = null;
    let detalles = [];
    try {
      detalles = data.Detalles || [];
      devolData = { ...data };
      delete devolData.Detalles;

      // validate foreign keys
      const models = sequelize.models;
      if (devolData.IdVenta && models.Venta) {
        const venta = await models.Venta.findByPk(devolData.IdVenta);
        if (!venta) throw new Error(`Venta no encontrada (Id=${devolData.IdVenta})`);
      }
      if (devolData.IdTurnoCaja && models.TurnoCaja) {
        const turno = await models.TurnoCaja.findByPk(devolData.IdTurnoCaja);
        if (!turno) throw new Error(`TurnoCaja no encontrado (Id=${devolData.IdTurnoCaja})`);
      }
      if (devolData.IdEmpleado && models.Usuario) {
        const emp = await models.Usuario.findByPk(devolData.IdEmpleado);
        if (!emp) throw new Error(`Empleado no encontrado (Id=${devolData.IdEmpleado})`);
      }

      const devol = await this.devolucionDAO.create(devolData, { transaction: t });
      const pk = this.devolucionDAO.model.primaryKeyAttribute || 'Id';
      const devolId = devol[pk] || (devol.get && devol.get(pk));

      // Por cada renglón: crea el MovimientoStock (NOT NULL en el esquema), suma stock a la
      // misma fila de Inventario (mismo IMEI si es serializado) y recién ahí crea el detalle.
      for (const d of detalles) {
        if (!d.IdArticulo) throw new Error('Cada detalle de devolución requiere IdArticulo (Id de Inventario)');
        const inv = await models.Inventario.findByPk(d.IdArticulo, { transaction: t, lock: t.LOCK.UPDATE });
        if (!inv) throw new Error(`Inventario no encontrado (Id=${d.IdArticulo})`);

        const movStock = await models.MovimientoStock.create({
          Fecha: new Date(),
          TipoMovimiento: 'Reingreso por Garantía',
          Cantidad: d.Cantidad,
          IdInventario: inv.Id,
          IdEmpleado: devolData.IdEmpleado
        }, { transaction: t });

        await inv.update({ Stock: inv.Stock + d.Cantidad }, { transaction: t });

        const detallePayload = {
          Cantidad: d.Cantidad,
          IdArticulo: d.IdArticulo,
          IdDevolucionVenta: devolId,
          IdMovimientoStock: movStock.Id
        };
        await this.detalleDAO.create(detallePayload, { transaction: t });
      }

      await t.commit();

      const Detalle = sequelize.models.DetalleDevolucionVenta;
      return await this.devolucionDAO.getById(devolId, { include: [ { model: Detalle, as: 'detalles' } ] });
    } catch (err) {
      await t.rollback();
      console.error('Error creando devolucion transactional:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear devolucion';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const item = await this.devolucionDAO.getById(id);
    if (!item) throw new Error('DevolucionVenta no encontrada');
    return await this.devolucionDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.devolucionDAO.getById(id);
    if (!item) throw new Error('DevolucionVenta no encontrada');
    return await this.devolucionDAO.remove(id);
  }
}

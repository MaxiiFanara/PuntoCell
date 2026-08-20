export default class CuotaService {
  constructor(cuotaDAO) {
    this.cuotaDAO = cuotaDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.cuotaDAO.getAll({
      page,
      limit,
      attributes: this.ATTRIBUTES,
      include: [{
        association: 'venta',
        attributes: ['Id'],
        include: [{ association: 'cliente', attributes: ['Nombre', 'Apellido'] }]
      }]
    });
  }

  async getById(id) {
    const item = await this.cuotaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Cuota no encontrada');
    return item;
  }

  async create(data) {
    const sequelize = this.cuotaDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;
      if (data.IdVenta && models.Venta) {
        const venta = await models.Venta.findByPk(data.IdVenta);
        if (!venta) throw new Error(`Venta no encontrada (Id=${data.IdVenta})`);
      }
      if (data.IdTurnoCaja && models.TurnoCaja) {
        const turno = await models.TurnoCaja.findByPk(data.IdTurnoCaja);
        if (!turno) throw new Error(`TurnoCaja no encontrado (Id=${data.IdTurnoCaja})`);
      }

      const created = await this.cuotaDAO.create(data, { transaction: t });
      await t.commit();
      return created;
    } catch (err) {
      await t.rollback();
      console.error('Error creando Cuota:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear cuota';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const item = await this.cuotaDAO.getById(id);
    if (!item) throw new Error('Cuota no encontrada');
    return await this.cuotaDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.cuotaDAO.getById(id);
    if (!item) throw new Error('Cuota no encontrada');
    return await this.cuotaDAO.remove(id);
  }
}

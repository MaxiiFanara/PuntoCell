export default class ReclamoGarantiaService {
  constructor(dao) {
    this.dao = dao;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('ReclamoGarantia no encontrado');
    return item;
  }

  async create(data) {
    const sequelize = this.dao.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;
      if (data.IdDetalleVenta && models.DetalleVenta) {
        const det = await models.DetalleVenta.findByPk(data.IdDetalleVenta);
        if (!det) throw new Error(`DetalleVenta no encontrado (Id=${data.IdDetalleVenta})`);
      }
      if (data.IdEmpleado && models.Usuario) {
        const emp = await models.Usuario.findByPk(data.IdEmpleado);
        if (!emp) throw new Error(`Empleado no encontrado (Id=${data.IdEmpleado})`);
      }
      if (data.IdEstadoReclamo && models.EstadoReclamo) {
        const est = await models.EstadoReclamo.findByPk(data.IdEstadoReclamo);
        if (!est) throw new Error(`EstadoReclamo no encontrado (Id=${data.IdEstadoReclamo})`);
      }

      const created = await this.dao.create(data, { transaction: t });
      await t.commit();
      return created;
    } catch (err) {
      await t.rollback();
      console.error('Error creando ReclamoGarantia:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear reclamo';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('ReclamoGarantia no encontrado');
    return await this.dao.update(id, data);
  }

  async remove(id) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('ReclamoGarantia no encontrado');
    return await this.dao.remove(id);
  }
}

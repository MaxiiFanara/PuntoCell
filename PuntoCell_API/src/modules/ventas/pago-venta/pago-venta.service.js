export default class PagoVentaService {
  constructor(pagoDAO) {
    this.pagoDAO = pagoDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.pagoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('PagoVenta no encontrado');
    return item;
  }

  async create(data) {
    const sequelize = this.pagoDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;

      // Validate Venta exists
      if (data.IdVenta && models.Venta) {
        const venta = await models.Venta.findByPk(data.IdVenta);
        if (!venta) throw new Error(`Venta no encontrada (Id=${data.IdVenta})`);
      }

      // determine Pagado flag (default to true when not provided)
      const pagadoFlag = (data.Pagado !== undefined) ? !!data.Pagado : true;
      const payload = { ...data, Pagado: pagadoFlag };

      const pago = await this.pagoDAO.create(payload, { transaction: t });

      // If pagado, update Venta.EstadoPago to true
      if (pagadoFlag && models.Venta) {
        await models.Venta.update({ EstadoPago: true }, { where: { Id: data.IdVenta }, transaction: t });
      }

      await t.commit();

      return pago;
    } catch (err) {
      await t.rollback();
      console.error('Error creando PagoVenta:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear pago';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const item = await this.pagoDAO.getById(id);
    if (!item) throw new Error('PagoVenta no encontrado');

    const sequelize = this.pagoDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const pagadoFlag = (data.Pagado !== undefined) ? !!data.Pagado : undefined;

      const payload = { ...data };
      if (pagadoFlag !== undefined) payload.Pagado = pagadoFlag;

      const updated = await this.pagoDAO.update(id, payload, { transaction: t });

      // if changed to pagado, set Venta.EstadoPago
      if (pagadoFlag && payload.IdVenta) {
        await sequelize.models.Venta.update({ EstadoPago: true }, { where: { Id: payload.IdVenta }, transaction: t });
      }

      await t.commit();
      return updated;
    } catch (err) {
      await t.rollback();
      console.error('Error actualizando PagoVenta:', err && (err.stack || err.message || err));
      throw err;
    }
  }

  async remove(id) {
    const item = await this.pagoDAO.getById(id);
    if (!item) throw new Error('PagoVenta no encontrado');
    return await this.pagoDAO.remove(id);
  }
}

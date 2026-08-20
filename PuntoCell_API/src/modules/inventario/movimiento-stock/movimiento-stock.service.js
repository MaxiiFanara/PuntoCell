export default class MovimientoStockService {
  constructor(movimientoStockDAO) {
    this.movimientoStockDAO = movimientoStockDAO;
    this.ATTRIBUTES = {};
  }

  _getRelatedModels() {
    const sequelize = this.movimientoStockDAO.model.sequelize;
    return {
      Inventario: sequelize.models.Inventario,
      Usuario: sequelize.models.Usuario
    };
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    const { Inventario, Usuario } = this._getRelatedModels();
    return await this.movimientoStockDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, include: [
      { model: Inventario, as: 'inventario', attributes: ['Id'] },
      { model: Usuario, as: 'empleado', attributes: ['Id', 'Nombre'] }
    ] });
  }

  async getById(id) {
    const { Inventario, Usuario } = this._getRelatedModels();
    const item = await this.movimientoStockDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: Inventario, as: 'inventario', attributes: ['Id'] },
      { model: Usuario, as: 'empleado', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) throw new Error('MovimientoStock no encontrado');
    return item;
  }

  async create(data) {
    const { Inventario, Usuario } = this._getRelatedModels();
    const inv = await Inventario.findByPk(data.IdInventario);
    if (!inv) throw new Error('Inventario no encontrado');
    const emp = await Usuario.findByPk(data.IdEmpleado);
    if (!emp) throw new Error('Empleado no encontrado');

    return await this.movimientoStockDAO.create(data);
  }

  async update(id, data) {
    const item = await this.movimientoStockDAO.getById(id);
    if (!item) throw new Error('MovimientoStock no encontrado');
    const { Inventario, Usuario } = this._getRelatedModels();
    if (data.IdInventario !== undefined) {
      const inv = await Inventario.findByPk(data.IdInventario);
      if (!inv) throw new Error('Inventario no encontrado');
    }
    if (data.IdEmpleado !== undefined) {
      const emp = await Usuario.findByPk(data.IdEmpleado);
      if (!emp) throw new Error('Empleado no encontrado');
    }

    return await this.movimientoStockDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.movimientoStockDAO.getById(id);
    if (!item) throw new Error('MovimientoStock no encontrado');
    return await this.movimientoStockDAO.remove(id);
  }
}

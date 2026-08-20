export default class DescuentoService {
  constructor(descuentoDAO) {
    this.descuentoDAO = descuentoDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.descuentoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.descuentoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Descuento no encontrado');
    return item;
  }

  async create(data) {
    return await this.descuentoDAO.create(data);
  }

  async update(id, data) {
    const item = await this.descuentoDAO.getById(id);
    if (!item) throw new Error('Descuento no encontrado');
    return await this.descuentoDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.descuentoDAO.getById(id);
    if (!item) throw new Error('Descuento no encontrado');
    return await this.descuentoDAO.remove(id);
  }
}

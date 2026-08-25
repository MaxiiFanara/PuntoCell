export default class EstadoReclamoService {
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
    if (!item) throw new Error('EstadoReclamo no encontrado');
    return item;
  }

  async create(data) {
    return await this.dao.create(data);
  }

  async update(id, data) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoReclamo no encontrado');
    return await this.dao.update(id, data);
  }

  async remove(id) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoReclamo no encontrado');
    return await this.dao.remove(id);
  }
}

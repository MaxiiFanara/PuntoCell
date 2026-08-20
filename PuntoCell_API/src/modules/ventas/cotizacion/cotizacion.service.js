export default class CotizacionService {
  constructor(cotizacionDAO) {
    this.cotizacionDAO = cotizacionDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.cotizacionDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.cotizacionDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Cotizacion no encontrada');
    return item;
  }

  async create(data) {
    return await this.cotizacionDAO.create(data);
  }

  async update(id, data) {
    const item = await this.cotizacionDAO.getById(id);
    if (!item) throw new Error('Cotizacion no encontrada');
    return await this.cotizacionDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.cotizacionDAO.getById(id);
    if (!item) throw new Error('Cotizacion no encontrada');
    return await this.cotizacionDAO.remove(id);
  }
}

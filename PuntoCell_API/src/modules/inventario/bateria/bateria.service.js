export default class BateriaService {
  constructor(bateriaDAO) {
    this.bateriaDAO = bateriaDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.bateriaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.bateriaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Batería no encontrada');
    return item;
  }

  async create(data) {
    const existe = await this.bateriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) throw new Error('La batería ya existe');
    return await this.bateriaDAO.create(data);
  }

  async update(id, data) {
    const item = await this.bateriaDAO.getById(id);
    if (!item) throw new Error('Batería no encontrada');
    if (data.Capacidad !== undefined) {
      const existe = await this.bateriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe una batería con esa capacidad');
    }
    return await this.bateriaDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.bateriaDAO.getById(id);
    if (!item) throw new Error('Batería no encontrada');
    return await this.bateriaDAO.remove(id);
  }
}

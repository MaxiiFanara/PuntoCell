export default class MemoriaService {
  constructor(memoriaDAO) {
    this.memoriaDAO = memoriaDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.memoriaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.memoriaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Memoria no encontrada');
    return item;
  }

  async create(data) {
    const existe = await this.memoriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) throw new Error('La memoria ya existe');
    return await this.memoriaDAO.create(data);
  }

  async update(id, data) {
    const item = await this.memoriaDAO.getById(id);
    if (!item) throw new Error('Memoria no encontrada');
    if (data.Capacidad !== undefined) {
      const existe = await this.memoriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe una memoria con esa capacidad');
    }
    return await this.memoriaDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.memoriaDAO.getById(id);
    if (!item) throw new Error('Memoria no encontrada');
    return await this.memoriaDAO.remove(id);
  }
}

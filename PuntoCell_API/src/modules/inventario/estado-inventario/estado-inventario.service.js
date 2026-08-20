export default class EstadoInventarioService {
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
    if (!item) throw new Error('EstadoInventario no encontrado');
    return item;
  }

  async create(data) {
    const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('El estado ya existe');
    return await this.dao.create(data);
  }

  async update(id, data) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoInventario no encontrado');
    if (data.Nombre !== undefined) {
      const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un estado con ese nombre');
    }
    return await this.dao.update(id, data);
  }

  async remove(id) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoInventario no encontrado');
    return await this.dao.remove(id);
  }
}

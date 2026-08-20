export default class AlmacenamientoService {
  constructor(almacenamientoDAO) {
    this.almacenamientoDAO = almacenamientoDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.almacenamientoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.almacenamientoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Almacenamiento no encontrado');
    return item;
  }

  async create(data) {
    const existe = await this.almacenamientoDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) throw new Error('El almacenamiento ya existe');
    return await this.almacenamientoDAO.create(data);
  }

  async update(id, data) {
    const item = await this.almacenamientoDAO.getById(id);
    if (!item) throw new Error('Almacenamiento no encontrado');
    if (data.Capacidad !== undefined) {
      const existe = await this.almacenamientoDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un almacenamiento con esa capacidad');
    }
    return await this.almacenamientoDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.almacenamientoDAO.getById(id);
    if (!item) throw new Error('Almacenamiento no encontrado');
    return await this.almacenamientoDAO.remove(id);
  }
}

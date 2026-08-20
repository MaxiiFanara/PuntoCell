export default class ColorService {
  constructor(colorDAO) {
    this.colorDAO = colorDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.colorDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.colorDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Color no encontrado');
    return item;
  }

  async create(data) {
    const existe = await this.colorDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('El color ya existe');
    return await this.colorDAO.create(data);
  }

  async update(id, data) {
    const item = await this.colorDAO.getById(id);
    if (!item) throw new Error('Color no encontrado');
    if (data.Nombre !== undefined) {
      const existe = await this.colorDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un color con ese nombre');
    }
    return await this.colorDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.colorDAO.getById(id);
    if (!item) throw new Error('Color no encontrado');
    return await this.colorDAO.remove(id);
  }
}

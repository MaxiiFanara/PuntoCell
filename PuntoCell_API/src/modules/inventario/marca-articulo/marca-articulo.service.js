export default class MarcaArticuloService {
  constructor(marcaDAO) {
    this.marcaDAO = marcaDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.marcaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.marcaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('MarcaArticulo no encontrado');
    return item;
  }

  async create(data) {
    const existe = await this.marcaDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('La marca ya existe');
    return await this.marcaDAO.create(data);
  }

  async update(id, data) {
    const item = await this.marcaDAO.getById(id);
    if (!item) throw new Error('MarcaArticulo no encontrado');
    if (data.Nombre !== undefined) {
      const existe = await this.marcaDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe una marca con ese nombre');
    }
    return await this.marcaDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.marcaDAO.getById(id);
    if (!item) throw new Error('MarcaArticulo no encontrado');
    return await this.marcaDAO.remove(id);
  }
}

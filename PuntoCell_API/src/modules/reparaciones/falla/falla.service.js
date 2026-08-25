export default class FallaService {
  constructor(fallaDAO) {
    this.fallaDAO = fallaDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.fallaDAO.getAll({
      page,
      limit,
      where: { Activa: true }
    });
  }

  async getById(id) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) {
      const err = new Error('Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }
    return falla;
  }

  async create(data) {
    return await this.fallaDAO.create(data);
  }

  async update(id, data) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) {
      const err = new Error('Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }

    return await this.fallaDAO.update(id, data);
  }

  async delete(id) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) {
      const err = new Error('Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }
    
    // Baja lógica
    const actualizado = await this.fallaDAO.update(id, { Activa: false });
    if (!actualizado) throw new Error('No se pudo dar de baja la falla');
    return true;
  }

  async getByCategoriaArticulo(idCategoria) {
  return await this.fallaDAO.getAll({
    where: { IdCategoriaArticulo: idCategoria, Activa: true }
  });
}
}
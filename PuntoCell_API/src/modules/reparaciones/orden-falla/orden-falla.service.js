export default class OrdenFallaService {
  constructor(ordenFallaDAO) {
    this.ordenFallaDAO = ordenFallaDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.ordenFallaDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) {
      const err = new Error('Relación Orden-Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }
    return ordenFalla;
  }

  async create(data) {
    const existe = await this.ordenFallaDAO.findOne({ 
      where: { IdOrdenReparacion: data.IdOrdenReparacion, IdFalla: data.IdFalla } 
    });
    if (existe) throw new Error('Esta falla ya está registrada en la orden de reparación');

    return await this.ordenFallaDAO.create(data);
  }

  async update(id, data) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) {
      const err = new Error('Relación Orden-Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }

    return await this.ordenFallaDAO.update(id, data);
  }

  async delete(id) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) {
      const err = new Error('Relación Orden-Falla no encontrada');
      err.statusCode = 404;
      throw err;
    }
    
    const eliminado = await this.ordenFallaDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la relación Orden-Falla');
    return true;
  }
}
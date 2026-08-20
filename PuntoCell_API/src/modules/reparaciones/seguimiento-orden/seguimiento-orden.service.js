export default class SeguimientoOrdenService {
  constructor(seguimientoOrdenDAO) {
    this.seguimientoOrdenDAO = seguimientoOrdenDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.seguimientoOrdenDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) {
      const err = new Error('Seguimiento de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return seguimiento;
  }

  async create(data) {
    const nuevoSeguimiento = {
      ...data,
      FechaModificacion: data.FechaModificacion ? new Date(data.FechaModificacion) : new Date()
    };
    return await this.seguimientoOrdenDAO.create(nuevoSeguimiento);
  }

  async update(id, data) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) {
      const err = new Error('Seguimiento de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }

    return await this.seguimientoOrdenDAO.update(id, data);
  }

  async delete(id) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) {
      const err = new Error('Seguimiento de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }
    
    const eliminado = await this.seguimientoOrdenDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el seguimiento de la orden');
    return true;
  }
}
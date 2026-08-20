export default class EstadoOrdenService {
  constructor(estadoOrdenDAO) {
    this.estadoOrdenDAO = estadoOrdenDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.estadoOrdenDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) {
      const err = new Error('Estado de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return estado;
  }

  async create(data) {
    const existe = await this.estadoOrdenDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('Ya existe un estado con ese nombre');
    
    return await this.estadoOrdenDAO.create(data);
  }

  async update(id, data) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) {
      const err = new Error('Estado de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }

    if (data.Nombre) {
      const existe = await this.estadoOrdenDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un estado con ese nombre');
    }
    
    return await this.estadoOrdenDAO.update(id, data);
  }

  async delete(id) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) {
      const err = new Error('Estado de orden no encontrado');
      err.statusCode = 404;
      throw err;
    }

    // Eliminación física (al no tener campo Activo)
    const eliminado = await this.estadoOrdenDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el estado');
    return true;
  }
}
export default class PermisoService {
  constructor(permisoDAO) {
    this.permisoDAO = permisoDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.permisoDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) throw new Error('Permiso no encontrado');
    return permiso;
  }

  async create(data) {
    const existe = await this.permisoDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('Ya existe un permiso con ese nombre');
    return await this.permisoDAO.create(data);
  }

  async update(id, data) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) throw new Error('Permiso no encontrado');
    
    if (data.Nombre) {
      const existe = await this.permisoDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un permiso con ese nombre');
    }
    return await this.permisoDAO.update(id, data);
  }

  async delete(id) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) throw new Error('Permiso no encontrado');
    
    // Eliminación física ya que no hay campo 'Activo' en esta tabla
    const eliminado = await this.permisoDAO.remove(id); 
    if (!eliminado) throw new Error('No se pudo eliminar el permiso');
    return true;
  }
}
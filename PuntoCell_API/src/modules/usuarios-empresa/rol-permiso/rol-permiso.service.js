export default class RolPermisoService {
  constructor(rolPermisoDAO) {
    this.rolPermisoDAO = rolPermisoDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.rolPermisoDAO.getAll({
      page,
      limit
    });
  }

  async create(data) {
    const existe = await this.rolPermisoDAO.findOne({ 
      where: { IdRol: data.IdRol, IdPermiso: data.IdPermiso } 
    });
    if (existe) throw new Error('El rol ya tiene asignado este permiso');
    
    return await this.rolPermisoDAO.create(data);
  }

  async delete(idRol, idPermiso) {
    // Al ser una clave primaria compuesta, la eliminación física requiere ambos IDs
    const eliminado = await this.rolPermisoDAO.model.destroy({ 
      where: { IdRol: idRol, IdPermiso: idPermiso } 
    });
    
    if (!eliminado) throw new Error('Asignación no encontrada');
    return true;
  }
}
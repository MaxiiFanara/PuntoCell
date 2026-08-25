export default class RolService {
  constructor(rolDAO) {
    this.rolDAO = rolDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.rolDAO.getAll({
      page,
      limit,
      where: { Activo: true },
      attributes: this.ATTRIBUTES
    });
  }

  async getById(id) {
    const rol = await this.rolDAO.getById(id, {
      attributes: this.ATTRIBUTES
    });
    if (!rol) throw new Error('Rol no encontrado');
    return rol;
  }

  async create(data) {
    const existe = await this.rolDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('Ya existe un rol con ese nombre');
    return await this.rolDAO.create(data);
  }

  async update(id, data) {
    const rol = await this.rolDAO.getById(id);
    if (!rol) throw new Error('Rol no encontrado');
    if (data.Nombre) {
      const existe = await this.rolDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un rol con ese nombre');
    }
    return await this.rolDAO.update(id, data);
  }

  async delete(id) {
    const rol = await this.rolDAO.getById(id);
    if (!rol) throw new Error('Rol no encontrado');
    const actualizado = await this.rolDAO.update(id, { Activo: false });
    if (!actualizado) throw new Error('No se pudo dar de baja el rol');
    return true;
  }
}
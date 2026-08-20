export default class ProveedorService {
  constructor(proveedorDAO) {
    this.proveedorDAO = proveedorDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.proveedorDAO.getAll({
      page,
      limit,
      where: { Activo: true }
    });
  }

  async getById(id) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado');
    return proveedor;
  }

  async create(data) {
    const existe = await this.proveedorDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('Ya existe un proveedor con ese nombre');
    
    return await this.proveedorDAO.create(data);
  }

  async update(id, data) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado');
    
    if (data.Nombre) {
      const existe = await this.proveedorDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un proveedor con ese nombre');
    }
    
    return await this.proveedorDAO.update(id, data);
  }

  async delete(id) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado');
    
    // Baja lógica
    const actualizado = await this.proveedorDAO.update(id, { Activo: false });
    if (!actualizado) throw new Error('No se pudo dar de baja el proveedor');
    return true;
  }
}
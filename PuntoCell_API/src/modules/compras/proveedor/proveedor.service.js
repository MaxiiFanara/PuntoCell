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

  // Nombre, Email y Celular son únicos — se valida acá (mensaje de negocio limpio) en
  // vez de depender del índice único de la base, que tiraría un error crudo de SQL.
  async _validarDuplicados(data, { excluirId } = {}) {
    const campos = [
      ['Nombre', 'nombre'],
      ['Email', 'email'],
      ['Celular', 'celular']
    ];

    for (const [campo, etiqueta] of campos) {
      if (!data[campo]) continue;
      const existe = await this.proveedorDAO.findOne({ where: { [campo]: data[campo] } });
      if (existe && (excluirId === undefined || existe.Id !== excluirId)) {
        throw new Error(`Ya existe un proveedor con ese ${etiqueta}`);
      }
    }
  }

  async create(data) {
    await this._validarDuplicados(data);
    return await this.proveedorDAO.create(data);
  }

  async update(id, data) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado');

    await this._validarDuplicados(data, { excluirId: parseInt(id) });

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
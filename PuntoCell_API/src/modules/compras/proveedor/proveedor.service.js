import { auditar } from '../../../core/utils/audit.util.js';

export default class ProveedorService {
  constructor(proveedorDAO, bitacoraService = null) {
    this.proveedorDAO = proveedorDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.proveedorDAO.getAll({
      page,
      limit,
      where: { Activo: true },
      order: [['Nombre', 'ASC']]
    });
  }

  async getById(id) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) {
      const err = new Error('Proveedor no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return proveedor;
  }

  async create(data, ctx = null) {
    const existe = await this.proveedorDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      const err = new Error('Ya existe un proveedor con ese nombre');
      err.statusCode = 409;
      throw err;
    }

    const creado = await this.proveedorDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Creó el proveedor "${data.Nombre}"`,
      `Alta de proveedor`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) {
      const err = new Error('Proveedor no encontrado');
      err.statusCode = 404;
      throw err;
    }

    if (data.Nombre) {
      const existe = await this.proveedorDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        const err = new Error('Ya existe un proveedor con ese nombre');
        err.statusCode = 409;
        throw err;
      }
    }

    const actualizado = await this.proveedorDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el proveedor "${proveedor.Nombre}"`,
      `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const proveedor = await this.proveedorDAO.getById(id);
    if (!proveedor) {
      const err = new Error('Proveedor no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const actualizado = await this.proveedorDAO.update(id, { Activo: false });
    if (!actualizado) throw new Error('No se pudo dar de baja el proveedor');
    await auditar(this.bitacoraService, ctx, `Dio de baja el proveedor "${proveedor.Nombre}"`,
      `Baja lógica de proveedor`);
    return true;
  }
}

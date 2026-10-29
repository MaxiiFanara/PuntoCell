import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Estado de orden no encontrado'); e.statusCode = 404; return e; };

export default class EstadoOrdenService {
  constructor(estadoOrdenDAO, bitacoraService = null) {
    this.estadoOrdenDAO = estadoOrdenDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.estadoOrdenDAO.getAll({ page, limit });
  }

  async getById(id) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) throw noEncontrado();
    return estado;
  }

  async create(data, ctx = null) {
    const existe = await this.estadoOrdenDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) { const e = new Error('Ya existe un estado con ese nombre'); e.statusCode = 409; throw e; }
    const creado = await this.estadoOrdenDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Creó el estado de orden "${data.Nombre}"`, `Alta de estado de orden`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) throw noEncontrado();
    if (data.Nombre) {
      const existe = await this.estadoOrdenDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) { const e = new Error('Ya existe un estado con ese nombre'); e.statusCode = 409; throw e; }
    }
    const actualizado = await this.estadoOrdenDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el estado de orden "${estado.Nombre}"`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const estado = await this.estadoOrdenDAO.getById(id);
    if (!estado) throw noEncontrado();
    const eliminado = await this.estadoOrdenDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el estado');
    await auditar(this.bitacoraService, ctx, `Eliminó el estado de orden "${estado.Nombre}"`, `Baja de estado de orden`);
    return true;
  }
}

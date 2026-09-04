import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Seguimiento de orden no encontrado'); e.statusCode = 404; return e; };

export default class SeguimientoOrdenService {
  constructor(seguimientoOrdenDAO, bitacoraService = null) {
    this.seguimientoOrdenDAO = seguimientoOrdenDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.seguimientoOrdenDAO.getAll({ page, limit });
  }

  async getById(id) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) throw noEncontrado();
    return seguimiento;
  }

  async create(data, ctx = null) {
    const creado = await this.seguimientoOrdenDAO.create({
      ...data,
      FechaModificacion: data.FechaModificacion ? new Date(data.FechaModificacion) : new Date()
    });
    await auditar(this.bitacoraService, ctx, `Agregó un seguimiento a la orden de reparación #${data.IdOrdenReparacion} (#${creado.Id})`,
      `Estado ${data.IdEstadoOrden ?? '-'}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) throw noEncontrado();
    const actualizado = await this.seguimientoOrdenDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el seguimiento de orden #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const seguimiento = await this.seguimientoOrdenDAO.getById(id);
    if (!seguimiento) throw noEncontrado();
    const eliminado = await this.seguimientoOrdenDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el seguimiento de la orden');
    await auditar(this.bitacoraService, ctx, `Eliminó el seguimiento de orden #${id}`, `Baja de seguimiento`);
    return true;
  }
}

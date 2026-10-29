import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrada = () => { const e = new Error('Devolución de compra no encontrada'); e.statusCode = 404; return e; };

export default class DevolucionCompraService {
  constructor(devolucionCompraDAO, bitacoraService = null) {
    this.devolucionCompraDAO = devolucionCompraDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.devolucionCompraDAO.getAll({ page, limit });
  }

  async getById(id) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw noEncontrada();
    return devolucion;
  }

  async create(data, ctx = null) {
    const nuevaDevolucion = { ...data, Fecha: data.Fecha ? new Date(data.Fecha) : new Date() };
    const creada = await this.devolucionCompraDAO.create(nuevaDevolucion);
    await auditar(this.bitacoraService, ctx, `Registró una devolución de la compra`,
      `Monto recuperado ${data.MontoRecuperado ?? '-'} · motivo: ${data.Motivo ?? '-'}`);
    return creada;
  }

  async update(id, data, ctx = null) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw noEncontrada();
    const actualizada = await this.devolucionCompraDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó la devolución de compra`,
      `Campos: ${Object.keys(data).join(', ')}`);
    return actualizada;
  }

  async delete(id, ctx = null) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw noEncontrada();
    const eliminado = await this.devolucionCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la devolución de compra');
    await auditar(this.bitacoraService, ctx, `Eliminó la devolución de compra`, `Baja de devolución de compra`);
    return true;
  }
}

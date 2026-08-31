import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Detalle de devolución de compra no encontrado'); e.statusCode = 404; return e; };

export default class DetalleDevolucionCompraService {
  constructor(detalleDevolucionCompraDAO, bitacoraService = null) {
    this.detalleDevolucionCompraDAO = detalleDevolucionCompraDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.detalleDevolucionCompraDAO.getAll({ page, limit });
  }

  async getById(id) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    return detalle;
  }

  async create(data, ctx = null) {
    const creado = await this.detalleDevolucionCompraDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Agregó un artículo a la devolución de compra #${data.IdDevolucionCompra} (detalle #${creado.Id})`,
      `Cantidad ${data.Cantidad}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    const actualizado = await this.detalleDevolucionCompraDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el detalle de devolución de compra #${id}`,
      `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    const eliminado = await this.detalleDevolucionCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el detalle de devolución de compra');
    await auditar(this.bitacoraService, ctx, `Eliminó el detalle de devolución de compra #${id}`, `Baja de detalle de devolución`);
    return true;
  }
}

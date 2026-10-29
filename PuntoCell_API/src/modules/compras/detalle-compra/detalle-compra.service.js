import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Detalle de compra no encontrado'); e.statusCode = 404; return e; };

export default class DetalleCompraService {
  constructor(detalleCompraDAO, bitacoraService = null) {
    this.detalleCompraDAO = detalleCompraDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.detalleCompraDAO.getAll({ page, limit });
  }

  async getById(id) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    return detalle;
  }

  async create(data, ctx = null) {
    const creado = await this.detalleCompraDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Agregó un renglón a la compra`,
      `Cantidad ${data.Cantidad} · costo unitario ${data.PrecioCostoUnitario}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    const actualizado = await this.detalleCompraDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el renglón de compra`,
      `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw noEncontrado();
    const eliminado = await this.detalleCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el detalle de compra');
    await auditar(this.bitacoraService, ctx, `Eliminó el renglón de compra`, `Baja de detalle de compra`);
    return true;
  }
}

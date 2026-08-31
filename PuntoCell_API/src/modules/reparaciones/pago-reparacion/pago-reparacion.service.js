import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Pago de reparación no encontrado'); e.statusCode = 404; return e; };

export default class PagoReparacionService {
  constructor(pagoReparacionDAO, bitacoraService = null) {
    this.pagoReparacionDAO = pagoReparacionDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoReparacionDAO.getAll({ page, limit });
  }

  async getById(id) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) throw noEncontrado();
    return pago;
  }

  async create(data, ctx = null) {
    const creado = await this.pagoReparacionDAO.create({
      ...data,
      FechaPago: data.FechaPago ? new Date(data.FechaPago) : new Date()
    });
    await auditar(this.bitacoraService, ctx, `Registró un pago de ${data.Monto} en la orden de reparación #${data.IdOrdenReparacion} (pago #${creado.Id})`,
      `Método ${data.IdMetodoPago ?? '-'} · turno ${data.IdTurnoCaja ?? '-'}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) throw noEncontrado();
    const actualizado = await this.pagoReparacionDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el pago de reparación #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) throw noEncontrado();
    const eliminado = await this.pagoReparacionDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el pago de reparación');
    await auditar(this.bitacoraService, ctx, `Eliminó el pago de reparación #${id}`, `Baja de pago de reparación`);
    return true;
  }
}

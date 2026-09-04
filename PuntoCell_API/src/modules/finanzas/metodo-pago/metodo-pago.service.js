import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('MetodoPago no encontrado'); e.statusCode = 404; return e; };

export default class MetodoPagoService {
  constructor(dao, bitacoraService = null) {
    this.dao = dao;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES, order: [['Nombre', 'ASC']] });
  }

  async getById(id) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw noEncontrado();
    return item;
  }

  async create(data, ctx = null) {
    const creado = await this.dao.create(data);
    await auditar(this.bitacoraService, ctx, `Creó el método de pago "${data.Nombre}" (#${creado.Id})`, `Alta de método de pago`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const item = await this.dao.getById(id);
    if (!item) throw noEncontrado();
    const actualizado = await this.dao.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el método de pago "${item.Nombre}" (#${id})`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const item = await this.dao.getById(id);
    if (!item) throw noEncontrado();
    const eliminado = await this.dao.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó el método de pago "${item.Nombre}" (#${id})`, `Baja de método de pago`);
    return eliminado;
  }
}

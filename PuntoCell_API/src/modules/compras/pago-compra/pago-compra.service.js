export default class PagoCompraService {
  constructor(pagoCompraDAO) {
    this.pagoCompraDAO = pagoCompraDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoCompraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const pago = await this.pagoCompraDAO.getById(id);
    if (!pago) throw new Error('Pago de compra no encontrado');
    return pago;
  }

  async create(data) {
    const nuevoPago = {
      ...data,
      FechaPago: data.FechaPago ? new Date(data.FechaPago) : new Date()
    };
    return await this.pagoCompraDAO.create(nuevoPago);
  }

  async update(id, data) {
    const pago = await this.pagoCompraDAO.getById(id);
    if (!pago) throw new Error('Pago de compra no encontrado');
    
    return await this.pagoCompraDAO.update(id, data);
  }

  async delete(id) {
    const pago = await this.pagoCompraDAO.getById(id);
    if (!pago) throw new Error('Pago de compra no encontrado');
    
    const eliminado = await this.pagoCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el pago de la compra');
    return true;
  }
}
export default class DetalleDevolucionCompraService {
  constructor(detalleDevolucionCompraDAO) {
    this.detalleDevolucionCompraDAO = detalleDevolucionCompraDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.detalleDevolucionCompraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de devolución de compra no encontrado');
    return detalle;
  }

  async create(data) {
    return await this.detalleDevolucionCompraDAO.create(data);
  }

  async update(id, data) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de devolución de compra no encontrado');
    
    return await this.detalleDevolucionCompraDAO.update(id, data);
  }

  async delete(id) {
    const detalle = await this.detalleDevolucionCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de devolución de compra no encontrado');
    
    const eliminado = await this.detalleDevolucionCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el detalle de devolución de compra');
    return true;
  }
}
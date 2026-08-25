export default class DetalleCompraService {
  constructor(detalleCompraDAO) {
    this.detalleCompraDAO = detalleCompraDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.detalleCompraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de compra no encontrado');
    return detalle;
  }

  async create(data) {
    return await this.detalleCompraDAO.create(data);
  }

  async update(id, data) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de compra no encontrado');
    
    return await this.detalleCompraDAO.update(id, data);
  }

  async delete(id) {
    const detalle = await this.detalleCompraDAO.getById(id);
    if (!detalle) throw new Error('Detalle de compra no encontrado');
    
    const eliminado = await this.detalleCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el detalle de compra');
    return true;
  }
}
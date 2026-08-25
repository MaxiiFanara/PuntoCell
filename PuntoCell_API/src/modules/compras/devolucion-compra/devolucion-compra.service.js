export default class DevolucionCompraService {
  constructor(devolucionCompraDAO) {
    this.devolucionCompraDAO = devolucionCompraDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.devolucionCompraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw new Error('Devolución de compra no encontrada');
    return devolucion;
  }

  async create(data) {
    const nuevaDevolucion = {
      ...data,
      Fecha: data.Fecha ? new Date(data.Fecha) : new Date()
    };
    return await this.devolucionCompraDAO.create(nuevaDevolucion);
  }

  async update(id, data) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw new Error('Devolución de compra no encontrada');
    
    return await this.devolucionCompraDAO.update(id, data);
  }

  async delete(id) {
    const devolucion = await this.devolucionCompraDAO.getById(id);
    if (!devolucion) throw new Error('Devolución de compra no encontrada');
    
    const eliminado = await this.devolucionCompraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la devolución de compra');
    return true;
  }
}
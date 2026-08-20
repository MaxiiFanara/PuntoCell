export default class CompraService {
  constructor(compraDAO) {
    this.compraDAO = compraDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.compraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');
    return compra;
  }

  async create(data) {
    const nuevaCompra = {
      ...data,
      Fecha: data.Fecha ? new Date(data.Fecha) : new Date()
    };
    return await this.compraDAO.create(nuevaCompra);
  }

  async update(id, data) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');
    
    return await this.compraDAO.update(id, data);
  }

  async delete(id) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');
    
    // Eliminación física
    const eliminado = await this.compraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la compra');
    return true;
  }
}
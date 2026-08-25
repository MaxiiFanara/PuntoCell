export default class PagoReparacionService {
  constructor(pagoReparacionDAO) {
    this.pagoReparacionDAO = pagoReparacionDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoReparacionDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) {
      const err = new Error('Pago de reparación no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return pago;
  }

  async create(data) {
    const nuevoPago = {
      ...data,
      FechaPago: data.FechaPago ? new Date(data.FechaPago) : new Date()
    };
    return await this.pagoReparacionDAO.create(nuevoPago);
  }

  async update(id, data) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) {
      const err = new Error('Pago de reparación no encontrado');
      err.statusCode = 404;
      throw err;
    }

    return await this.pagoReparacionDAO.update(id, data);
  }

  async delete(id) {
    const pago = await this.pagoReparacionDAO.getById(id);
    if (!pago) {
      const err = new Error('Pago de reparación no encontrado');
      err.statusCode = 404;
      throw err;
    }
    
    const eliminado = await this.pagoReparacionDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar el pago de reparación');
    return true;
  }
}
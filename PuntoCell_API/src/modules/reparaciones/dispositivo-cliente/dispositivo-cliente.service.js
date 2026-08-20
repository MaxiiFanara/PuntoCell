export default class DispositivoClienteService {
  constructor(dispositivoClienteDAO) {
    this.dispositivoClienteDAO = dispositivoClienteDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dispositivoClienteDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) {
      const err = new Error('Dispositivo del cliente no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return dispositivo;
  }

  async create(data) {
    const nuevoDispositivo = { ...data, CreatedAt: new Date() };
    return await this.dispositivoClienteDAO.create(nuevoDispositivo);
  }

  async update(id, data) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) {
      const err = new Error('Dispositivo del cliente no encontrado');
      err.statusCode = 404;
      throw err;
    }

    return await this.dispositivoClienteDAO.update(id, data);
  }

  async delete(id) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) {
      const err = new Error('Dispositivo del cliente no encontrado');
      err.statusCode = 404;
      throw err;
    }

    // Baja lógica: DispositivoCliente ahora tiene columna Activo
    const actualizado = await this.dispositivoClienteDAO.update(id, { Activo: false });
    if (!actualizado) throw new Error('No se pudo dar de baja el dispositivo');
    return true;
  }
}
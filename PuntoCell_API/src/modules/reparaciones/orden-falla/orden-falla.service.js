import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrada = () => { const e = new Error('Relación Orden-Falla no encontrada'); e.statusCode = 404; return e; };

export default class OrdenFallaService {
  constructor(ordenFallaDAO, bitacoraService = null) {
    this.ordenFallaDAO = ordenFallaDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.ordenFallaDAO.getAll({ page, limit });
  }

  async getById(id) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) throw noEncontrada();
    return ordenFalla;
  }

  async create(data, ctx = null) {
    const existe = await this.ordenFallaDAO.findOne({
      where: { IdOrdenReparacion: data.IdOrdenReparacion, IdFalla: data.IdFalla }
    });
    if (existe) { const e = new Error('Esta falla ya está registrada en la orden de reparación'); e.statusCode = 409; throw e; }
    const creada = await this.ordenFallaDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Asoció la falla #${data.IdFalla} a la orden de reparación #${data.IdOrdenReparacion}`,
      `Alta de relación orden-falla #${creada.Id}`);
    return creada;
  }

  async update(id, data, ctx = null) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) throw noEncontrada();
    const actualizada = await this.ordenFallaDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó la relación orden-falla #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizada;
  }

  async delete(id, ctx = null) {
    const ordenFalla = await this.ordenFallaDAO.getById(id);
    if (!ordenFalla) throw noEncontrada();
    const eliminado = await this.ordenFallaDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la relación Orden-Falla');
    await auditar(this.bitacoraService, ctx, `Quitó la falla de la orden de reparación (relación #${id})`, `Baja de relación orden-falla`);
    return true;
  }
}

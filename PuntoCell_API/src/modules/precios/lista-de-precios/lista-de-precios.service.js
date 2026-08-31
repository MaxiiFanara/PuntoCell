import { auditar } from '../../../core/utils/audit.util.js';

export default class ListaPreciosService {
  constructor(listaPreciosDAO, bitacoraService = null) {
    this.listaPreciosDAO = listaPreciosDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    return this.listaPreciosDAO.getAll({ page: query.page, limit: query.limit });
  }

  async getById(id) {
    return this.listaPreciosDAO.getById(id);
  }

  async create(data, ctx = null) {
    const creada = await this.listaPreciosDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Creó la lista de precios "${data.Nombre}" (#${creada.Id})`,
      `Rentabilidad ${data.PorcentajeRentabilidad}% · categoría ${data.IdCategoriaProducto ?? 'genérica'}`);
    return creada;
  }

  async update(id, data, ctx = null) {
    const actualizada = await this.listaPreciosDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó la lista de precios #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizada;
  }

  async remove(id, ctx = null) {
    const eliminada = await this.listaPreciosDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó la lista de precios #${id}`, `Baja de lista de precios`);
    return eliminada;
  }
}

import { auditar } from '../../../core/utils/audit.util.js';
import { repreciarPorLista } from '../../../core/utils/precios.util.js';

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
    const existente = await this.listaPreciosDAO.getById(id);
    if (!existente) return null;

    // Si cambia el % de rentabilidad, todos los precios de venta ya calculados con esta
    // lista quedan desincronizados — hay que recalcularlos en la misma transacción.
    const rentabilidadNueva = data.PorcentajeRentabilidad;
    const cambiaRentabilidad = rentabilidadNueva !== undefined
      && Number(rentabilidadNueva) !== Number(existente.PorcentajeRentabilidad);

    const sequelize = this.listaPreciosDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const actualizada = await this.listaPreciosDAO.update(id, data, { transaction: t });

      let afectados = 0;
      if (cambiaRentabilidad) {
        const recreados = await repreciarPorLista(
          sequelize,
          { IdListaPrecio: id, PorcentajeRentabilidad: rentabilidadNueva },
          t
        );
        afectados = recreados.length;
      }

      await t.commit();

      await auditar(this.bitacoraService, ctx, `Modificó la lista de precios #${id}`,
        cambiaRentabilidad
          ? `Rentabilidad ${existente.PorcentajeRentabilidad}% → ${rentabilidadNueva}% · recalculó ${afectados} precio(s) de venta`
          : `Campos: ${Object.keys(data).join(', ')}`);

      return actualizada;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async remove(id, ctx = null) {
    const eliminada = await this.listaPreciosDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó la lista de precios #${id}`, `Baja de lista de precios`);
    return eliminada;
  }
}

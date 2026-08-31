import { auditar } from '../../../core/utils/audit.util.js';

export default class PreciosArticulosService {
  constructor(preciosArticulosDAO, listaPreciosService, bitacoraService = null) {
    this.preciosArticulosDAO = preciosArticulosDAO;
    this.listaPreciosService = listaPreciosService;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) { return this.preciosArticulosDAO.getAll({ page: query.page, limit: query.limit }); }
  async getById(id) { return this.preciosArticulosDAO.getById(id); }

  round2(value) {
    return Number(Number(value || 0).toFixed(2));
  }

  async computeFields(payload) {
    const CostoBase = this.round2(payload.CostoBase || 0);
    const CostosVariables = this.round2(CostoBase * 0.26);
    const CostoReal = this.round2(CostoBase + CostosVariables);

    let PorcentajeGanancia = 0;
    if (payload.IdListaPrecio) {
      const lista = await this.listaPreciosService.getById(payload.IdListaPrecio);
      if (lista) {
        PorcentajeGanancia = Number(lista.PorcentajeRentabilidad || 0);
      }
    }

    const ValorFinal = this.round2(CostoReal + (CostoReal * (PorcentajeGanancia / 100)));

    return { CostoBase, CostosVariables, CostoReal, PorcentajeGanancia, ValorFinal };
  }

  async create(data, ctx = null) {
    const computed = await this.computeFields(data);
    const payload = { ...data, ...computed };
    const creado = await this.preciosArticulosDAO.create(payload);
    await auditar(this.bitacoraService, ctx,
      `Cargó un precio para el inventario #${data.IdInventario} (precio #${creado.Id})`,
      `Lista ${data.IdListaPrecio} · costo ${computed.CostoBase} → venta ${computed.ValorFinal}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const existing = await this.preciosArticulosDAO.getById(id);
    if (!existing) return null;

    const existingData = existing.dataValues ? existing.dataValues : existing;
    const merged = { ...existingData, ...data };
    const computed = await this.computeFields(merged);
    const payload = { ...merged, ...computed };
    const actualizado = await this.preciosArticulosDAO.update(id, payload);
    await auditar(this.bitacoraService, ctx, `Modificó el precio de artículo #${id}`,
      `Nuevo costo ${computed.CostoBase} → venta ${computed.ValorFinal}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const eliminado = await this.preciosArticulosDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó el precio de artículo #${id}`, `Baja de precio de artículo`);
    return eliminado;
  }
}

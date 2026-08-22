export default class PreciosArticulosService {
  constructor(preciosArticulosDAO, listaPreciosService) {
    this.preciosArticulosDAO = preciosArticulosDAO;
    this.listaPreciosService = listaPreciosService;
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

  async create(data) {
    const computed = await this.computeFields(data);
    const payload = { ...data, ...computed };
    return this.preciosArticulosDAO.create(payload);
  }

  async update(id, data) {
    const existing = await this.preciosArticulosDAO.getById(id);
    if (!existing) return null;

    const existingData = existing.dataValues ? existing.dataValues : existing;
    const merged = { ...existingData, ...data };
    const computed = await this.computeFields(merged);
    const payload = { ...merged, ...computed };
    return this.preciosArticulosDAO.update(id, payload);
  }

  async remove(id) { return this.preciosArticulosDAO.remove(id); }
}

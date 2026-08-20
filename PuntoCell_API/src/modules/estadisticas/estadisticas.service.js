export default class EstadisticasService {
  constructor({ marcaDAO, dispositivoDAO, repuestoDAO, fallaDAO, finanzasDAO }) {
    this.marcaDAO = marcaDAO;
    this.dispositivoDAO = dispositivoDAO;
    this.repuestoDAO = repuestoDAO;
    this.fallaDAO = fallaDAO;
    this.finanzasDAO = finanzasDAO;
  }

  // Si llega ?limit=N devuelve solo el top N; sin limit, el ranking completo.
  _opcionesRanking(query = {}) {
    const { limit } = query;
    if (!limit) return {};
    const n = parseInt(limit, 10);
    return Number.isFinite(n) && n > 0 ? { page: 1, limit: n } : {};
  }

  async getMarcasReparadas(query = {}) {
    return this.marcaDAO.getAll({
      order: [['CantidadReparaciones', 'DESC'], ['Marca', 'ASC']],
      ...this._opcionesRanking(query)
    });
  }

  async getDispositivosReparados(query = {}) {
    return this.dispositivoDAO.getAll({
      order: [['CantidadReparaciones', 'DESC'], ['Dispositivo', 'ASC']],
      ...this._opcionesRanking(query)
    });
  }

  async getRepuestosUsados(query = {}) {
    return this.repuestoDAO.getAll({
      order: [['CantidadUsada', 'DESC'], ['Repuesto', 'ASC']],
      ...this._opcionesRanking(query)
    });
  }

  async getFallasRepetidas(query = {}) {
    return this.fallaDAO.getAll({
      order: [['CantidadReportada', 'DESC'], ['Falla', 'ASC']],
      ...this._opcionesRanking(query)
    });
  }

  async getFinanzas() {
    return this.finanzasDAO.findOne({});
  }

  // KPIs del dashboard en una sola respuesta: top 1 de cada métrica + finanzas.
  async getDashboard() {
    const [marca] = await this.getMarcasReparadas({ limit: 1 });
    const [dispositivo] = await this.getDispositivosReparados({ limit: 1 });
    const [repuesto] = await this.getRepuestosUsados({ limit: 1 });
    const [falla] = await this.getFallasRepetidas({ limit: 1 });
    const finanzas = await this.getFinanzas();

    return {
      marcaMasReparada: marca ?? null,
      dispositivoMasReparado: dispositivo ?? null,
      repuestoMasUsado: repuesto ?? null,
      fallaMasRepetida: falla ?? null,
      finanzas: finanzas ?? null
    };
  }
}

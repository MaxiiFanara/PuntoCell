export default class PreciosArticulosService {
  constructor(preciosArticulosDAO) { this.preciosArticulosDAO = preciosArticulosDAO; }

  async getAll(query = {}) { return this.preciosArticulosDAO.getAll({ page: query.page, limit: query.limit }); }
  async getById(id) { return this.preciosArticulosDAO.getById(id); }
  async create(data) { return this.preciosArticulosDAO.create(data); }
  async update(id, data) { return this.preciosArticulosDAO.update(id, data); }
  async remove(id) { return this.preciosArticulosDAO.remove(id); }
}

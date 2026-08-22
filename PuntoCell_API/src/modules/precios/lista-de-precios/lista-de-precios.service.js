export default class ListaPreciosService {
  constructor(listaPreciosDAO) {
    this.listaPreciosDAO = listaPreciosDAO;
  }

  async getAll(query = {}) {
    return this.listaPreciosDAO.getAll({ page: query.page, limit: query.limit });
  }

  async getById(id) {
    return this.listaPreciosDAO.getById(id);
  }

  async create(data) {
    return this.listaPreciosDAO.create(data);
  }

  async update(id, data) {
    return this.listaPreciosDAO.update(id, data);
  }

  async remove(id) {
    return this.listaPreciosDAO.remove(id);
  }
}

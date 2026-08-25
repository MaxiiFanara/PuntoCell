export default class ArticuloService {
  constructor(articuloDAO) {
    this.articuloDAO = articuloDAO;
    this.ATTRIBUTES = { };
  }

  _getRelatedModels() {
    const sequelize = this.articuloDAO.model.sequelize;
    return {
      ModeloArticulo: sequelize.models.ModeloArticulo
    };
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    const { ModeloArticulo } = this._getRelatedModels();
    return await this.articuloDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, include: [
      { model: ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre'] }
    ] });
  }

  async getById(id) {
    const { ModeloArticulo } = this._getRelatedModels();
    const item = await this.articuloDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) throw new Error('Articulo no encontrado');
    return item;
  }

  async create(data) {
    const { ModeloArticulo } = this._getRelatedModels();
    const modelo = await ModeloArticulo.findByPk(data.IdModeloArticulo);
    if (!modelo) throw new Error('ModeloArticulo no encontrado');

    return await this.articuloDAO.create(data);
  }

  async update(id, data) {
    const item = await this.articuloDAO.getById(id);
    if (!item) throw new Error('Articulo no encontrado');
    if (data.Nombre !== undefined) {
      const existe = await this.articuloDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un articulo con ese nombre');
    }

    if (data.IdModeloArticulo !== undefined) {
      const { ModeloArticulo } = this._getRelatedModels();
      const modelo = await ModeloArticulo.findByPk(data.IdModeloArticulo);
      if (!modelo) throw new Error('ModeloArticulo no encontrado');
    }

    return await this.articuloDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.articuloDAO.getById(id);
    if (!item) throw new Error('Articulo no encontrado');
    return await this.articuloDAO.remove(id);
  }
}

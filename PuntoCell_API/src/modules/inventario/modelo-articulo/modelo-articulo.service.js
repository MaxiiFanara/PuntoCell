export default class ModeloArticuloService {
  constructor(modeloDAO) {
    this.modeloDAO = modeloDAO;
    this.ATTRIBUTES = ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'];
  }

  _getRelatedModels() {
    const sequelize = this.modeloDAO.model.sequelize;
    return {
      MarcaArticulo: sequelize.models.MarcaArticulo,
      CategoriaArticulo: sequelize.models.CategoriaArticulo
    };
  }

  async getAll(query = {}) {
    try {
      return await this.modeloDAO.getAll({ 
        attributes: this.ATTRIBUTES 
      });
    } catch (error) {
      // ESTO va a imprimir el error real de SQL Server en la terminal
      console.error("🔥 ERROR EXACTO DE SQL:", error.message);
      throw error;
    }
  }

  async getById(id) {
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    const item = await this.modeloDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'] },
      { model: CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) throw new Error('ModeloArticulo no encontrado');
    return item;
  }

  async create(data) {
    const existe = await this.modeloDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('El modelo ya existe');

    // validar existencia de Marca y Categoria
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    const marca = await MarcaArticulo.findByPk(data.IdMarcaArticulo);
    if (!marca) throw new Error('MarcaArticulo no encontrada');
    const categoria = await CategoriaArticulo.findByPk(data.IdCategoriaArticulo);
    if (!categoria) throw new Error('CategoriaArticulo no encontrada');

    return await this.modeloDAO.create(data);
  }

  async update(id, data) {
    const item = await this.modeloDAO.getById(id);
    if (!item) throw new Error('ModeloArticulo no encontrado');
    if (data.Nombre !== undefined) {
      const existe = await this.modeloDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un modelo con ese nombre');
    }

    // validar existencia de Marca y Categoria (solo si vienen en el payload)
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    if (data.IdMarcaArticulo !== undefined) {
      const marca = await MarcaArticulo.findByPk(data.IdMarcaArticulo);
      if (!marca) throw new Error('MarcaArticulo no encontrada');
    }
    if (data.IdCategoriaArticulo !== undefined) {
      const categoria = await CategoriaArticulo.findByPk(data.IdCategoriaArticulo);
      if (!categoria) throw new Error('CategoriaArticulo no encontrada');
    }

    return await this.modeloDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.modeloDAO.getById(id);
    if (!item) throw new Error('ModeloArticulo no encontrado');
    return await this.modeloDAO.remove(id);
  }
}

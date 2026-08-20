class BaseDAO {
	constructor(model) {
		if (!model) {
			throw new Error('A Sequelize model is required');
		}
		this.model = model;
	}

	async getAll({ page, limit = 50, ...options } = {}) {
  if (page) {
    options.limit = limit;
    options.offset = (page - 1) * limit;
  }
  return this.model.findAll(options);
}

	// Paginado real: devuelve también el total de registros para armar la paginación en el front
	async getPage({ page = 1, limit = 10, ...options } = {}) {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const { rows, count } = await this.model.findAndCountAll({
    ...options,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    distinct: true,
  });
  return { rows, total: count, page: pageNum, limit: limitNum };
}

	async getById(id, options = {}) {
		return this.model.findByPk(id, options);
	}

	async findOne(options = {}) {
		return this.model.findOne(options);
	}


	async create(data, options = {}) {
		return this.model.create(data, options);
	}


	async update(id, data, options = {}) {
		const record = await this.getById(id, options);
		if (!record) return null;
		return record.update(data, options);
	}

	async remove(id, options = {}) {
		const record = await this.getById(id, options);
		if (!record) return false;
		await record.destroy(options);
		return true;
	}
	
	// Inserta múltiples registros de una sola vez
  async bulkCreate(dataArray, options = {}) {
    return await this.model.bulkCreate(dataArray, options);
  }
}

export default BaseDAO;
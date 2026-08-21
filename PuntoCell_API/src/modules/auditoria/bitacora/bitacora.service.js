export default class BitacoraService {
	constructor(dao) {
		this.dao = dao;
		this.ATTRIBUTES = {};
	}

	async getAll(query = {}) {
		const { page, limit } = query;
		return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES, order: [['Fecha', 'DESC']] });
	}

	async create(data) {
		// Ensure Fecha is set when not provided
		if (!data.Fecha) data.Fecha = new Date();
		return await this.dao.create(data);
	}
}

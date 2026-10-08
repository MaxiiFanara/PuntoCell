import { Op } from 'sequelize';
import { sinRegistrosDelAnalista } from '../../../core/utils/analista.util.js';

export default class BitacoraService {
	constructor(dao) {
		this.dao = dao;
		this.ATTRIBUTES = {};
	}

	async getAll(query = {}) {
		const { page, limit, origen } = query;
		// Por defecto solo la auditoría de usuarios (lo que muestra el front). Los logs técnicos
		// de Winston se piden con ?origen=SISTEMA, o todo junto con ?origen=TODOS.
		const origenPedido = String(origen ?? 'AUDITORIA').toUpperCase();
		const where = origenPedido === 'TODOS' ? {} : { Origen: origenPedido === 'SISTEMA' ? 'SISTEMA' : 'AUDITORIA' };
		return await this.dao.getAll({ page, limit, where: { [Op.and]: [where, sinRegistrosDelAnalista()] }, attributes: this.ATTRIBUTES, order: [['Fecha', 'DESC']] });
	}

	async create(data) {
		// Ensure Fecha is set when not provided
		if (!data.Fecha) data.Fecha = new Date();
		return await this.dao.create(data);
	}
}

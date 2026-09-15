import { models } from '../../models/index.js';
import BitacoraDAO from './bitacora/bitacora.dao.js';
import BitacoraService from './bitacora/bitacora.service.js';
import BitacoraController from './bitacora/bitacora.controller.js';

export function createAuditoriaModule() {
	const bitacoraDAO = new BitacoraDAO(models.Bitacora);
	const bitacoraService = new BitacoraService(bitacoraDAO);
	const bitacoraController = new BitacoraController(bitacoraService);

	return {
		bitacoraController,
		bitacoraService
		// auditoria analytics moved to central dashboard module
	};
}

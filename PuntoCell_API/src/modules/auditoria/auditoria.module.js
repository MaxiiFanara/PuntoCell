import { models } from '../../models/index.js';
import AccionDAO from './accion/accion.dao.js';
import AccionService from './accion/accion.service.js';
import AccionController from './accion/accion.controller.js';
import BitacoraDAO from './bitacora/bitacora.dao.js';
import BitacoraService from './bitacora/bitacora.service.js';
import BitacoraController from './bitacora/bitacora.controller.js';

export function createAuditoriaModule() {
	const bitacoraDAO = new BitacoraDAO(models.Bitacora);
	const bitacoraService = new BitacoraService(bitacoraDAO);
	const bitacoraController = new BitacoraController(bitacoraService);

	const accionDAO = new AccionDAO(models.Accion);
	const accionService = new AccionService(accionDAO, bitacoraService);
	const accionController = new AccionController(accionService);

	return {
		accionController,
		bitacoraController,
		bitacoraService
	};
}

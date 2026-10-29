import { models } from '../../models/index.js';
import BitacoraDAO from './bitacora/bitacora.dao.js';
import BitacoraService from './bitacora/bitacora.service.js';
import BitacoraController from './bitacora/bitacora.controller.js';
import InformeOperativoService from './informe-operativo/informe-operativo.service.js';
import InformeOperativoController from './informe-operativo/informe-operativo.controller.js';

export function createAuditoriaModule() {
	const bitacoraDAO = new BitacoraDAO(models.Bitacora);
	const bitacoraService = new BitacoraService(bitacoraDAO);
	const bitacoraController = new BitacoraController(bitacoraService);
	const informeOperativoController = new InformeOperativoController(new InformeOperativoService(models.Bitacora));

	return {
		bitacoraController,
		informeOperativoController,
		bitacoraService
		// auditoria analytics moved to central dashboard module
	};
}

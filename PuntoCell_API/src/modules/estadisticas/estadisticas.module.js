import { models } from '../../models/index.js';

import EstadisticaDAO from './estadisticas.dao.js';
import EstadisticasService from './estadisticas.service.js';
import EstadisticasController from './estadisticas.controller.js';

export function createEstadisticasModule() {
  const marcaDAO = new EstadisticaDAO(models.MetricaMarcaReparada);
  const dispositivoDAO = new EstadisticaDAO(models.MetricaDispositivoReparado);
  const repuestoDAO = new EstadisticaDAO(models.MetricaRepuestoUsado);
  const fallaDAO = new EstadisticaDAO(models.MetricaFallaRepetida);
  const finanzasDAO = new EstadisticaDAO(models.FinanzasResumen);

  const service = new EstadisticasService({
    marcaDAO,
    dispositivoDAO,
    repuestoDAO,
    fallaDAO,
    finanzasDAO
  });
  const estadisticasController = new EstadisticasController(service);

  return { estadisticasController };
}

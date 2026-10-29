import AsistenteTecnicoService from './asistente-tecnico.service.js';
import AsistenteTecnicoController from './asistente-tecnico.controller.js';

export function createAsistenteTecnicoModule() {
  const asistenteTecnicoService = new AsistenteTecnicoService();
  const asistenteTecnicoController = new AsistenteTecnicoController(asistenteTecnicoService);

  return { asistenteTecnicoController };
}
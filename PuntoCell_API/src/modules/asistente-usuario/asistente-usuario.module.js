import AsistenteUsuarioService from './asistente-usuario.service.js';
import AsistenteUsuarioController from './asistente-usuario.controller.js';

export function createAsistenteUsuarioModule() {
  const asistenteUsuarioService = new AsistenteUsuarioService();
  const asistenteUsuarioController = new AsistenteUsuarioController(asistenteUsuarioService);

  return { asistenteUsuarioController };
}
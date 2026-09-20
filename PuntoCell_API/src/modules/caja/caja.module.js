import { models } from '../../models/index.js';
import CajaService from './caja.service.js';
import CajaController from './caja.controller.js';

export function createCajaModule() {
  const cajaService = new CajaService(models);
  const cajaController = new CajaController(cajaService);

  return {
    cajaService,
    cajaController
  };
}

export default createCajaModule;
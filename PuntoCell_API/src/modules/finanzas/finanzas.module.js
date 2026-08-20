import { models } from '../../models/index.js';
import MetodoPagoDAO from './metodo-pago/metodo-pago.dao.js';
import MetodoPagoService from './metodo-pago/metodo-pago.service.js';
import MetodoPagoController from './metodo-pago/metodo-pago.controller.js';

export function createFinanzasModule() {
  const metodoPagoDAO = new MetodoPagoDAO(models.MetodoPago);
  const metodoPagoService = new MetodoPagoService(metodoPagoDAO);
  const metodoPagoController = new MetodoPagoController(metodoPagoService);

  return {
    metodoPagoController
  };
}

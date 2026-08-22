import { models } from '../../models/index.js';
import ListaPreciosDAO from './lista-de-precios/lista-de-precios.dao.js';
import ListaPreciosService from './lista-de-precios/lista-de-precios.service.js';
import ListaPreciosController from './lista-de-precios/lista-de-precios.controller.js';
import PreciosArticulosDAO from './precios-articulos/precios-articulos.dao.js';
import PreciosArticulosService from './precios-articulos/precios-articulos.service.js';
import PreciosArticulosController from './precios-articulos/precios-articulos.controller.js';

export function createPreciosModule(bitacoraService = null) {
  const listaDAO = new ListaPreciosDAO(models.ListaPrecio);
  const listaService = new ListaPreciosService(listaDAO);
  const listaController = new ListaPreciosController(listaService);

  const preciosArticulosDAO = new PreciosArticulosDAO(models.PrecioArticulo);
  const preciosArticulosService = new PreciosArticulosService(preciosArticulosDAO);
  const preciosArticulosController = new PreciosArticulosController(preciosArticulosService);

  return {
    listaPreciosController: listaController,
    preciosArticulosController: preciosArticulosController
  };
}

import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';

import { bateriaSchema, bateriaUpdateSchema } from './bateria/bateria.dto.js';
import { colorSchema, colorUpdateSchema } from './color/color.dto.js';
import { estadoInventarioSchema, estadoInventarioUpdateSchema } from './estado-inventario/estado-inventario.dto.js';
import { categoriaArticuloSchema, categoriaArticuloUpdateSchema } from './categoria-articulo/categoria-articulo.dto.js';
import { marcaArticuloSchema, marcaArticuloUpdateSchema } from './marca-articulo/marca-articulo.dto.js';
import { memoriaSchema, memoriaUpdateSchema } from './memoria/memoria.dto.js';
import { modeloArticuloSchema, modeloArticuloUpdateSchema } from './modelo-articulo/modelo-articulo.dto.js';
import { almacenamientoSchema, almacenamientoUpdateSchema } from './almacenamiento/almacenamiento.dto.js';
import { articuloSchema, articuloUpdateSchema } from './articulo/articulo.dto.js';
import { inventarioSchema, inventarioUpdateSchema } from './inventario/inventario.dto.js';
import { movimientoStockSchema, movimientoStockUpdateSchema } from './movimiento-stock/movimiento-stock.dto.js';
import { transferenciaSchema, transferenciaUpdateSchema } from './transferencia/transferencia.dto.js';

export default (container) => {
  const router = Router();

  const {
    bateriaController,
    colorController,
    estadoInventarioController,
    categoriaArticuloController,
    marcaArticuloController,
    memoriaController,
    modeloArticuloController,
    almacenamientoController,
    articuloController
  } = container.inventario;

  // Baterias
  router.get('/baterias', bateriaController.getAll);
  router.get('/baterias/:id', bateriaController.getById);
  router.post('/baterias', validateFields(bateriaSchema), bateriaController.create);
  router.put('/baterias/:id', validateFields(bateriaUpdateSchema), bateriaController.update);
  router.delete('/baterias/:id', bateriaController.remove);

  // Colores
  router.get('/colores', colorController.getAll);
  router.get('/colores/:id', colorController.getById);
  router.post('/colores', validateFields(colorSchema), colorController.create);
  router.put('/colores/:id', validateFields(colorUpdateSchema), colorController.update);
  router.delete('/colores/:id', colorController.remove);

  // Estado Inventario
  router.get('/estado-inventarios', estadoInventarioController.getAll);
  router.get('/estado-inventarios/:id', estadoInventarioController.getById);
  router.post('/estado-inventarios', validateFields(estadoInventarioSchema), estadoInventarioController.create);
  router.put('/estado-inventarios/:id', validateFields(estadoInventarioUpdateSchema), estadoInventarioController.update);
  router.delete('/estado-inventarios/:id', estadoInventarioController.remove);

  // Categoria Articulo
  router.get('/categoria-articulos', categoriaArticuloController.getAll);
  router.get('/categoria-articulos/:id', categoriaArticuloController.getById);
  router.post('/categoria-articulos', validateFields(categoriaArticuloSchema), categoriaArticuloController.create);
  router.put('/categoria-articulos/:id', validateFields(categoriaArticuloUpdateSchema), categoriaArticuloController.update);
  router.delete('/categoria-articulos/:id', categoriaArticuloController.remove);

  // Marca Articulo
  router.get('/marca-articulos', marcaArticuloController.getAll);
  router.get('/marca-articulos/:id', marcaArticuloController.getById);
  router.post('/marca-articulos', validateFields(marcaArticuloSchema), marcaArticuloController.create);
  router.put('/marca-articulos/:id', validateFields(marcaArticuloUpdateSchema), marcaArticuloController.update);
  router.delete('/marca-articulos/:id', marcaArticuloController.remove);

  // Memoria
  router.get('/memorias', memoriaController.getAll);
  router.get('/memorias/:id', memoriaController.getById);
  router.post('/memorias', validateFields(memoriaSchema), memoriaController.create);
  router.put('/memorias/:id', validateFields(memoriaUpdateSchema), memoriaController.update);
  router.delete('/memorias/:id', memoriaController.remove);

  // Modelo Articulo
  router.get('/modelo-articulos', modeloArticuloController.getAll);
  router.get('/modelo-articulos/:id', modeloArticuloController.getById);
  router.post('/modelo-articulos', validateFields(modeloArticuloSchema), modeloArticuloController.create);
  router.put('/modelo-articulos/:id', validateFields(modeloArticuloUpdateSchema), modeloArticuloController.update);
  router.delete('/modelo-articulos/:id', modeloArticuloController.remove);

  // Almacenamiento
  router.get('/almacenamientos', almacenamientoController.getAll);
  router.get('/almacenamientos/:id', almacenamientoController.getById);
  router.post('/almacenamientos', validateFields(almacenamientoSchema), almacenamientoController.create);
  router.put('/almacenamientos/:id', validateFields(almacenamientoUpdateSchema), almacenamientoController.update);
  router.delete('/almacenamientos/:id', almacenamientoController.remove);

  // Articulo
  router.get('/articulos', articuloController.getAll);
  router.get('/articulos/:id', articuloController.getById);
  router.post('/articulos', validateFields(articuloSchema), articuloController.create);
  router.put('/articulos/:id', validateFields(articuloUpdateSchema), articuloController.update);
  router.delete('/articulos/:id', articuloController.remove);

  // Inventario
  router.get('/inventarios', container.inventario.inventarioController.getAll);
  router.get('/inventarios/:id', container.inventario.inventarioController.getById);
  router.post('/inventarios', validateFields(inventarioSchema), container.inventario.inventarioController.create);
  router.put('/inventarios/:id', validateFields(inventarioUpdateSchema), container.inventario.inventarioController.update);
  router.delete('/inventarios/:id', container.inventario.inventarioController.remove);

  // Movimiento Stock
  router.get('/movimiento-stock', container.inventario.movimientoStockController.getAll);
  router.get('/movimiento-stock/:id', container.inventario.movimientoStockController.getById);
  router.post('/movimiento-stock', validateFields(movimientoStockSchema), container.inventario.movimientoStockController.create);
  router.put('/movimiento-stock/:id', validateFields(movimientoStockUpdateSchema), container.inventario.movimientoStockController.update);
  router.delete('/movimiento-stock/:id', container.inventario.movimientoStockController.remove);

  // Transferencias
  router.post('/transferencias/ejecutar', container.inventario.transferenciaController.ejecutarTraspaso);
  router.get('/transferencias', container.inventario.transferenciaController.getAll);
  router.get('/transferencias/:id', container.inventario.transferenciaController.getById);
  router.post('/transferencias', validateFields(transferenciaSchema), container.inventario.transferenciaController.create);
  router.put('/transferencias/:id', validateFields(transferenciaUpdateSchema), container.inventario.transferenciaController.update);
  router.delete('/transferencias/:id', container.inventario.transferenciaController.remove);

  return router;
};

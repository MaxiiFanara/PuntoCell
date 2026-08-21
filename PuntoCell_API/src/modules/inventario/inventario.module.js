import { models } from '../../models/index.js';
import BateriaDAO from './bateria/bateria.dao.js';
import BateriaService from './bateria/bateria.service.js';
import BateriaController from './bateria/bateria.controller.js';
import ColorDAO from './color/color.dao.js';
import ColorService from './color/color.service.js';
import ColorController from './color/color.controller.js';
import EstadoInventarioDAO from './estado-inventario/estado-inventario.dao.js';
import EstadoInventarioService from './estado-inventario/estado-inventario.service.js';
import EstadoInventarioController from './estado-inventario/estado-inventario.controller.js';
import CategoriaArticuloDAO from './categoria-articulo/categoria-articulo.dao.js';
import CategoriaArticuloService from './categoria-articulo/categoria-articulo.service.js';
import CategoriaArticuloController from './categoria-articulo/categoria-articulo.controller.js';
import MarcaArticuloDAO from './marca-articulo/marca-articulo.dao.js';
import MarcaArticuloService from './marca-articulo/marca-articulo.service.js';
import MarcaArticuloController from './marca-articulo/marca-articulo.controller.js';
import MemoriaDAO from './memoria/memoria.dao.js';
import MemoriaService from './memoria/memoria.service.js';
import MemoriaController from './memoria/memoria.controller.js';
import AlmacenamientoDAO from './almacenamiento/almacenamiento.dao.js';
import AlmacenamientoService from './almacenamiento/almacenamiento.service.js';
import AlmacenamientoController from './almacenamiento/almacenamiento.controller.js';
import ModeloArticuloDAO from './modelo-articulo/modelo-articulo.dao.js';
import ModeloArticuloService from './modelo-articulo/modelo-articulo.service.js';
import ModeloArticuloController from './modelo-articulo/modelo-articulo.controller.js';
import ArticuloDAO from './articulo/articulo.dao.js';
import ArticuloService from './articulo/articulo.service.js';
import ArticuloController from './articulo/articulo.controller.js';
import InventarioDAO from './inventario/inventario.dao.js';
import InventarioService from './inventario/inventario.service.js';
import InventarioController from './inventario/inventario.controller.js';
import MovimientoStockDAO from './movimiento-stock/movimiento-stock.dao.js';
import MovimientoStockService from './movimiento-stock/movimiento-stock.service.js';
import MovimientoStockController from './movimiento-stock/movimiento-stock.controller.js';
import TransferenciaDAO from './transferencia/transferencia.dao.js';
import TransferenciaService from './transferencia/transferencia.service.js';
import TransferenciaController from './transferencia/transferencia.controller.js';

export function createInventarioModule(bitacoraService = null) {
	const bateriaDAO = new BateriaDAO(models.Bateria);
	const bateriaService = new BateriaService(bateriaDAO, bitacoraService);
	const bateriaController = new BateriaController(bateriaService);

	const colorDAO = new ColorDAO(models.Color);
	const colorService = new ColorService(colorDAO, bitacoraService);
	const colorController = new ColorController(colorService);
	const estadoDAO = new EstadoInventarioDAO(models.EstadoInventario);
	const estadoService = new EstadoInventarioService(estadoDAO, bitacoraService);
	const estadoController = new EstadoInventarioController(estadoService);
	const categoriaDAO = new CategoriaArticuloDAO(models.CategoriaArticulo);
	const categoriaService = new CategoriaArticuloService(categoriaDAO, bitacoraService);
	const categoriaController = new CategoriaArticuloController(categoriaService);
	const marcaDAO = new MarcaArticuloDAO(models.MarcaArticulo);
	const marcaService = new MarcaArticuloService(marcaDAO, bitacoraService);
	const marcaController = new MarcaArticuloController(marcaService);
	const memoriaDAO = new MemoriaDAO(models.Memoria);
	const memoriaService = new MemoriaService(memoriaDAO, bitacoraService);
	const memoriaController = new MemoriaController(memoriaService);
	const almacenamientoDAO = new AlmacenamientoDAO(models.Almacenamiento);
	const almacenamientoService = new AlmacenamientoService(almacenamientoDAO, bitacoraService);
	const almacenamientoController = new AlmacenamientoController(almacenamientoService);
	const modeloDAO = new ModeloArticuloDAO(models.ModeloArticulo);
	const modeloService = new ModeloArticuloService(modeloDAO, bitacoraService);
	const modeloController = new ModeloArticuloController(modeloService);
	const articuloDAO = new ArticuloDAO(models.Articulo);
	const articuloService = new ArticuloService(articuloDAO, bitacoraService);
	const articuloController = new ArticuloController(articuloService);
	const inventarioDAO = new InventarioDAO(models.Inventario);
	const inventarioService = new InventarioService(inventarioDAO, bitacoraService);
	const inventarioController = new InventarioController(inventarioService);
	const movimientoStockDAO = new MovimientoStockDAO(models.MovimientoStock);
	const movimientoStockService = new MovimientoStockService(movimientoStockDAO, bitacoraService);
	const movimientoStockController = new MovimientoStockController(movimientoStockService);
	const transferenciaDAO = new TransferenciaDAO(models.Transferencia);
	const transferenciaService = new TransferenciaService(transferenciaDAO, bitacoraService);
	const transferenciaController = new TransferenciaController(transferenciaService);

	return {
		bateriaController
		, colorController
		, estadoInventarioController: estadoController
		, categoriaArticuloController: categoriaController
		, marcaArticuloController: marcaController
		, memoriaController: memoriaController
		, modeloArticuloController: modeloController
		, articuloController: articuloController
		, almacenamientoController: almacenamientoController
		, inventarioController: inventarioController
		, movimientoStockController: movimientoStockController
		, transferenciaController: transferenciaController
	};
}


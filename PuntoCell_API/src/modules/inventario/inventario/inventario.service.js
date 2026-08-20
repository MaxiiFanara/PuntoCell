import { Op } from 'sequelize';

export default class InventarioService {
  constructor(inventarioDAO) {
    this.inventarioDAO = inventarioDAO;
    // Sin exclude: React necesita el Id como key
    this.ATTRIBUTES = {};
  }

  _getRelatedModels() {
    const sequelize = this.inventarioDAO.model.sequelize;
    return {
      Sucursal: sequelize.models.Sucursal,
      Articulo: sequelize.models.Articulo,
      EstadoInventario: sequelize.models.EstadoInventario,
      Proveedor: sequelize.models.Proveedor
    };
  }

  // No hay columna "plan canje" en la BD: se identifica por este proveedor placeholder.
  static PROVEEDOR_CANJE = 'canje de clientes';

  async getAll(query = {}) {
    const { page, limit, IdSucursal, soloVendibles, soloRepuestos, soloCanje, IMEI } = query;
    const { Sucursal, Articulo, EstadoInventario, Proveedor } = this._getRelatedModels();
    const sequelize = this.inventarioDAO.model.sequelize;

    const whereClause = {};
    if (IdSucursal) {
      whereClause.IdSucursal = Number(IdSucursal);
    }
    // Búsqueda exacta por IMEI (validación de duplicados y búsqueda en Punto de Venta)
    if (IMEI) {
      whereClause.IMEI = IMEI;
    }

    const esTruthy = (v) => v === true || v === 'true' || v === '1';

    // Solo Inventario cuyo Articulo esté marcado vendible y activo
    const articuloInclude = esTruthy(soloVendibles)
      ? { model: Articulo, as: 'articulo', where: { EsVendible: true, Activo: true }, required: true }
      : esTruthy(soloRepuestos)
        ? { model: Articulo, as: 'articulo', where: { EsRepuesto: true }, required: true }
        : { model: Articulo, as: 'articulo' };

    // Plan Canje: proveedor = placeholder de canje de clientes
    const proveedorInclude = esTruthy(soloCanje)
      ? {
          model: Proveedor, as: 'proveedor', required: true,
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('proveedor.Nombre')), InventarioService.PROVEEDOR_CANJE)
        }
      : { model: Proveedor, as: 'proveedor', attributes: ['Id', 'Nombre'] };

    return await this.inventarioDAO.getAll({
      page,
      limit,
      where: whereClause,
      include: [
        { model: Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'] },
        articuloInclude,
        proveedorInclude,
        { model: EstadoInventario, as: 'estado', attributes: ['Id', 'Nombre'] }
      ]
    });
  }

  async getById(id) {
    const { Sucursal, Articulo, EstadoInventario } = this._getRelatedModels();
    const sequelize = this.inventarioDAO.model.sequelize;
    const { Color, Memoria, ModeloArticulo } = sequelize.models;

    const item = await this.inventarioDAO.getById(id, {
      attributes: { exclude: [] }, // Aseguramos que traiga el Id
      include: [
        { model: Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'] },
        { model: EstadoInventario, as: 'estado', attributes: ['Id', 'Nombre'] },
        { model: Color, as: 'color', attributes: ['Nombre'] },
        { model: Memoria, as: 'memoria', attributes: ['Capacidad'] },
        {
          model: Articulo,
          as: 'articulo',
          include: [
            { model: ModeloArticulo, as: 'modelo', attributes: ['Nombre'] }
          ]
        }
      ]
    });

    if (!item) throw new Error('Inventario no encontrado');
    return item;
  }

  // Valida que el IMEI no esté usado por otra fila. No hace nada si imei es null (repuestos/accesorios no tienen IMEI).
  async _validarIMEI(imei, { excluirId } = {}) {
    if (!imei) return;
    const where = { IMEI: imei };
    if (excluirId !== undefined) where.Id = { [Op.ne]: excluirId };

    const existente = await this.inventarioDAO.findOne({ where });
    if (!existente) return;

    const tieneStock = Number(existente.Stock) > 0;
    const err = new Error(
      tieneStock
        ? `Ya existe un producto en inventario con el IMEI ${imei} (Id ${existente.Id}, Sucursal ${existente.IdSucursal}, Stock ${existente.Stock}).`
        : `El IMEI ${imei} ya existe en inventario (Id ${existente.Id}) pero está sin stock. Probablemente sea un reingreso ` +
          `(garantía, reparación de proveedor o recompra): edite ese registro en lugar de crear uno nuevo.`
    );
    err.statusCode = 409;
    err.reingreso = !tieneStock;
    err.idInventarioExistente = existente.Id;
    throw err;
  }

  // Los productos serializados (con IMEI) se cargan y se mantienen de a una unidad física.
  _validarStockSerializado(articulo, stock) {
    if (!articulo?.EsSerializado) return;
    if (stock === undefined || Number(stock) === 1) return;
    const err = new Error('Los productos serializados (con IMEI) deben cargarse con Stock = 1.');
    err.statusCode = 400;
    throw err;
  }

  async create(data) {
    const { Sucursal, Articulo, EstadoInventario } = this._getRelatedModels();
    const suc = await Sucursal.findByPk(data.IdSucursal);
    if (!suc) throw new Error('Sucursal no encontrada');
    const art = await Articulo.findByPk(data.IdArticulo);
    if (!art) throw new Error('Articulo no encontrado');
    const est = await EstadoInventario.findByPk(data.IdEstadoInventario);
    if (!est) throw new Error('EstadoInventario no encontrado');

    await this._validarIMEI(data.IMEI);
    this._validarStockSerializado(art, data.Stock);

    return await this.inventarioDAO.create(data);
  }

  async update(id, data) {
    const item = await this.inventarioDAO.getById(id);
    if (!item) throw new Error('Inventario no encontrado');
    const { Sucursal, Articulo, EstadoInventario } = this._getRelatedModels();

    if (data.IdSucursal !== undefined) {
      const suc = await Sucursal.findByPk(data.IdSucursal);
      if (!suc) throw new Error('Sucursal no encontrada');
    }
    let art = null;
    if (data.IdArticulo !== undefined) {
      art = await Articulo.findByPk(data.IdArticulo);
      if (!art) throw new Error('Articulo no encontrado');
    }
    if (data.IdEstadoInventario !== undefined) {
      const est = await EstadoInventario.findByPk(data.IdEstadoInventario);
      if (!est) throw new Error('EstadoInventario no encontrado');
    }

    if (data.IMEI !== undefined) {
      await this._validarIMEI(data.IMEI, { excluirId: Number(id) });
    }

    if (data.Stock !== undefined) {
      const articuloActual = art || await Articulo.findByPk(item.IdArticulo);
      this._validarStockSerializado(articuloActual, data.Stock);
    }

    return await this.inventarioDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.inventarioDAO.getById(id);
    if (!item) throw new Error('Inventario no encontrado');
    return await this.inventarioDAO.remove(id);
  }
}
import { Op } from 'sequelize';
import { registerAudit } from '../../../core/utils/audit.util.js';
import { resolverListasPrecioCategoria, reprecificarInventario } from '../../../core/utils/precios.util.js';

export default class InventarioService {
  constructor(inventarioDAO, bitacoraService = null) {
    this.inventarioDAO = inventarioDAO;
    this.bitacoraService = bitacoraService;
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

  async getAll(query = {}, auditContext = null) {
    const { page, limit, IdSucursal, soloVendibles, soloRepuestos, soloCanje, IMEI } = query;
    const { Sucursal, Articulo, EstadoInventario, Proveedor } = this._getRelatedModels();
    const sequelize = this.inventarioDAO.model.sequelize;
    const { Color, Memoria, Bateria, ModeloArticulo } = sequelize.models;

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
    // Nombre del modelo para la columna "Dispositivo" del listado. IdCategoriaArticulo viaja
    // también: el Actualizador de Precio (precios.jsx) lo necesita para ordenar Categoría ASC.
    articuloInclude.include = [{ model: ModeloArticulo, as: 'modelo', attributes: ['Nombre', 'IdCategoriaArticulo'] }];

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
        { model: EstadoInventario, as: 'estado', attributes: ['Id', 'Nombre'] },
        // Características por renglón: LEFT JOIN, así los accesorios/repuestos que no las
        // tienen igual vuelven con color/memoria/bateria en null.
        { model: Color, as: 'color', attributes: ['Nombre'] },
        { model: Memoria, as: 'memoria', attributes: ['Capacidad'] },
        { model: Bateria, as: 'bateria', attributes: ['Capacidad', 'Porcentaje'] }
      ]
    });
  }

  async getById(id, auditContext = null) {
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

    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Inventario no encontrado (Id=${id})`,
        Accion: 'Obtener Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Inventario no encontrado');
    }
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

  async create(data, auditContext = null) {
    const { Sucursal, Articulo, EstadoInventario } = this._getRelatedModels();
    const suc = await Sucursal.findByPk(data.IdSucursal);
    if (!suc) {
      await registerAudit(this.bitacoraService, {
        detalle: `Sucursal no encontrada Id=${data.IdSucursal}`,
        Accion: 'Crear Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Sucursal no encontrada');
    }
    const art = await Articulo.findByPk(data.IdArticulo);
    if (!art) {
      await registerAudit(this.bitacoraService, {
        detalle: `Articulo no encontrado Id=${data.IdArticulo}`,
        Accion: 'Crear Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Articulo no encontrado');
    }
    const est = await EstadoInventario.findByPk(data.IdEstadoInventario);
    if (!est) {
      await registerAudit(this.bitacoraService, {
        detalle: `EstadoInventario no encontrado Id=${data.IdEstadoInventario}`,
        Accion: 'Crear Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('EstadoInventario no encontrado');
    }

    await this._validarIMEI(data.IMEI);
    this._validarStockSerializado(art, data.Stock);

    // CostoBase no es columna de Inventario: si viene (alta por canje / ingreso manual con
    // costo), se usa para generar automáticamente el PrecioArticulo en las listas de la
    // categoría — igual que una compra. Se separa del payload que va al modelo.
    const { CostoBase, ...invData } = data;

    const sequelize = this.inventarioDAO.model.sequelize;
    const t = await sequelize.transaction();
    let created;
    try {
      created = await this.inventarioDAO.create(invData, { transaction: t });

      if (Number(CostoBase) > 0) {
        const modelo = await sequelize.models.ModeloArticulo.findByPk(art.IdModeloArticulo, { transaction: t });
        const listas = await resolverListasPrecioCategoria(sequelize, modelo?.IdCategoriaArticulo, t);
        await reprecificarInventario(sequelize, { IdInventario: created.Id, CostoBase, listas }, t);
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    await registerAudit(this.bitacoraService, {
      detalle: `Inventario creado Id=${created.Id || created.id || ''}${Number(CostoBase) > 0 ? ` (con precio, CostoBase=${CostoBase})` : ''}`,
      Accion: 'Crear Inventario',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.inventarioDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Inventario no encontrado (Id=${id})`,
        Accion: 'Actualizar Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Inventario no encontrado');
    }
    const { Sucursal, Articulo, EstadoInventario } = this._getRelatedModels();

    if (data.IdSucursal !== undefined) {
      const suc = await Sucursal.findByPk(data.IdSucursal);
      if (!suc) {
        await registerAudit(this.bitacoraService, {
          detalle: `Sucursal no encontrada Id=${data.IdSucursal}`,
          Accion: 'Actualizar Inventario',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Sucursal no encontrada');
      }
    }
    let art = null;
    if (data.IdArticulo !== undefined) {
      art = await Articulo.findByPk(data.IdArticulo);
      if (!art) {
        await registerAudit(this.bitacoraService, {
          detalle: `Articulo no encontrado Id=${data.IdArticulo}`,
          Accion: 'Actualizar Inventario',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Articulo no encontrado');
      }
    }
    if (data.IdEstadoInventario !== undefined) {
      const est = await EstadoInventario.findByPk(data.IdEstadoInventario);
      if (!est) {
        await registerAudit(this.bitacoraService, {
          detalle: `EstadoInventario no encontrado Id=${data.IdEstadoInventario}`,
          Accion: 'Actualizar Inventario',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('EstadoInventario no encontrado');
      }
    }

    if (data.IMEI !== undefined) {
      await this._validarIMEI(data.IMEI, { excluirId: Number(id) });
    }

    if (data.Stock !== undefined) {
      const articuloActual = art || await Articulo.findByPk(item.IdArticulo);
      this._validarStockSerializado(articuloActual, data.Stock);
    }

    const updated = await this.inventarioDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Inventario actualizado Id=${id}`,
      Accion: 'Actualizar Inventario',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.inventarioDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Inventario no encontrado (Id=${id})`,
        Accion: 'Eliminar Inventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Inventario no encontrado');
    }
    const removed = await this.inventarioDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Inventario eliminado Id=${id}`,
      Accion: 'Eliminar Inventario',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}
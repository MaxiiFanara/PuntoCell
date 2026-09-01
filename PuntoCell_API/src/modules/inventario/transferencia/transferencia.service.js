import { registerAudit } from '../../../core/utils/audit.util.js';

export default class TransferenciaService {
  constructor(transferenciaDAO, bitacoraService = null) {
    this.transferenciaDAO = transferenciaDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  _getRelatedModels() {
    const sequelize = this.transferenciaDAO.model.sequelize;
    return {
      Sucursal: sequelize.models.Sucursal,
      MovimientoStock: sequelize.models.MovimientoStock
    };
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    return await this.transferenciaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, include: [
      { model: Sucursal, as: 'sucursalOrigen', attributes: ['Id', 'Nombre'] },
      { model: Sucursal, as: 'sucursalDestino', attributes: ['Id', 'Nombre'] },
      { model: MovimientoStock, as: 'movimientoSalida', attributes: ['Id', 'Fecha'] },
      { model: MovimientoStock, as: 'movimientoIngreso', attributes: ['Id', 'Fecha'] }
    ] });
  }

  async getById(id, auditContext = null) {
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    const item = await this.transferenciaDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: Sucursal, as: 'sucursalOrigen', attributes: ['Id', 'Nombre'] },
      { model: Sucursal, as: 'sucursalDestino', attributes: ['Id', 'Nombre'] },
      { model: MovimientoStock, as: 'movimientoSalida', attributes: ['Id', 'Fecha'] },
      { model: MovimientoStock, as: 'movimientoIngreso', attributes: ['Id', 'Fecha'] }
    ] });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Transferencia no encontrada (Id=${id})`,
        Accion: 'Obtener Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Transferencia no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    const sucOri = await Sucursal.findByPk(data.IdSucursalOrigen);
    if (!sucOri) {
      await registerAudit(this.bitacoraService, {
        detalle: `Sucursal origen no encontrada Id=${data.IdSucursalOrigen}`,
        Accion: 'Crear Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Sucursal origen no encontrada');
    }
    const sucDest = await Sucursal.findByPk(data.IdSucursalDestino);
    if (!sucDest) {
      await registerAudit(this.bitacoraService, {
        detalle: `Sucursal destino no encontrada Id=${data.IdSucursalDestino}`,
        Accion: 'Crear Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Sucursal destino no encontrada');
    }
    const movOut = await MovimientoStock.findByPk(data.IdMovimientoSalida);
    if (!movOut) {
      await registerAudit(this.bitacoraService, {
        detalle: `Movimiento salida no encontrado Id=${data.IdMovimientoSalida}`,
        Accion: 'Crear Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Movimiento salida no encontrado');
    }
    const movIn = await MovimientoStock.findByPk(data.IdMovimientoIngreso);
    if (!movIn) {
      await registerAudit(this.bitacoraService, {
        detalle: `Movimiento ingreso no encontrado Id=${data.IdMovimientoIngreso}`,
        Accion: 'Crear Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Movimiento ingreso no encontrado');
    }

    const created = await this.transferenciaDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Transferencia creada Id=${created.Id || created.id || ''}`,
      Accion: 'Crear Transferencia',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  // Transacción: todo o nada.
  async ejecutarTraspaso(data, auditContext = null) {
    const sequelize = this.transferenciaDAO.model.sequelize;
    const { Inventario, MovimientoStock, Transferencia, Articulo } = sequelize.models;

    const t = await sequelize.transaction();

    try {
      // Preferimos IdInventario (fila puntual — obligatorio para serializados: cada IMEI
      // es su propia fila). Si no viene, se cae al modo viejo por Articulo + sucursal
      // (stock fungible no serializado).
      const invOrigen = data.IdInventario
        ? await Inventario.findByPk(data.IdInventario, { transaction: t })
        : await Inventario.findOne({
            where: { IdArticulo: data.IdArticulo, IdSucursal: data.IdSucursalOrigen },
            transaction: t
          });

      if (!invOrigen) {
        throw new Error('No se encontró el renglón de inventario a transferir en la sucursal de origen.');
      }
      if (Number(invOrigen.IdSucursal) !== Number(data.IdSucursalOrigen)) {
        throw new Error('El renglón de inventario indicado no pertenece a la sucursal de origen.');
      }
      if (invOrigen.Stock < data.Cantidad) {
        throw new Error('Stock insuficiente en la sucursal de origen');
      }

      const articulo = await Articulo.findByPk(invOrigen.IdArticulo, { transaction: t });
      let invDestino;

      if (articulo?.EsSerializado || invOrigen.IMEI) {
        // Serializado (con IMEI): es una unidad física puntual. Se relocaliza esa MISMA
        // fila a la sucursal destino. El IMEI es único global (UQ_Inventario_IMEI), así que
        // mover la fila nunca genera un duplicado — y que en destino ya haya otras unidades
        // del mismo modelo (otros IMEI) es perfectamente válido.
        if (Number(data.Cantidad) !== 1) {
          throw new Error('Los productos serializados (con IMEI) se transfieren de a una unidad: Cantidad debe ser 1.');
        }

        const movSalida = await MovimientoStock.create({
          Fecha: new Date(),
          TipoMovimiento: 'Salida por Traspaso',
          Cantidad: data.Cantidad,
          IdInventario: invOrigen.Id,
          IdEmpleado: data.IdEmpleado || 1
        }, { transaction: t });

        await invOrigen.update({ IdSucursal: data.IdSucursalDestino }, { transaction: t });
        invDestino = invOrigen; // misma fila, solo cambió de sucursal

        const movIngreso = await MovimientoStock.create({
          Fecha: new Date(),
          TipoMovimiento: 'Ingreso por Traspaso',
          Cantidad: data.Cantidad,
          IdInventario: invDestino.Id,
          IdEmpleado: data.IdEmpleado || 1
        }, { transaction: t });

        const transferencia = await Transferencia.create({
          IdSucursalOrigen: data.IdSucursalOrigen,
          IdSucursalDestino: data.IdSucursalDestino,
          IdMovimientoSalida: movSalida.id || movSalida.Id,
          IdMovimientoIngreso: movIngreso.id || movIngreso.Id
        }, { transaction: t });

        await t.commit();
        await registerAudit(this.bitacoraService, {
          detalle: `Traspaso ejecutado Id=${transferencia.Id || transferencia.id || ''}`,
          Accion: 'Ejecutar Traspaso',
          IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
          IdSucursal: data?.IdSucursalOrigen || auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        return transferencia;
      }

      // No serializado (stock fungible, sin IMEI): resta/suma Stock entre origen y destino.
      await invOrigen.update({ Stock: invOrigen.Stock - data.Cantidad }, { transaction: t });

      const movSalida = await MovimientoStock.create({
        Fecha: new Date(),
        TipoMovimiento: 'Salida por Traspaso',
        Cantidad: data.Cantidad,
        IdInventario: invOrigen.Id,
        IdEmpleado: data.IdEmpleado || 1
      }, { transaction: t });

      // El índice único filtrado UQ_Inventario_SucursalProducto es por
      // (Sucursal, Producto, Estado) sólo cuando IMEI IS NULL: buscamos/creamos esa fila.
      invDestino = await Inventario.findOne({
        where: {
          IdArticulo: invOrigen.IdArticulo,
          IdSucursal: data.IdSucursalDestino,
          IdEstadoInventario: invOrigen.IdEstadoInventario,
          IMEI: null
        },
        transaction: t
      });

      if (invDestino) {
        await invDestino.update({ Stock: invDestino.Stock + data.Cantidad }, { transaction: t });
      } else {
        // Fila nueva: copia del origen los campos NOT NULL (garantías, proveedor, atributos).
        // No serializado => IMEI queda null.
        invDestino = await Inventario.create({
          IdArticulo: invOrigen.IdArticulo,
          IdSucursal: data.IdSucursalDestino,
          IdEstadoInventario: invOrigen.IdEstadoInventario,
          Stock: data.Cantidad,
          MesesGarantiaMarca: invOrigen.MesesGarantiaMarca,
          MesesGarantiaLocal: invOrigen.MesesGarantiaLocal,
          IdProveedor: invOrigen.IdProveedor,
          IdColor: invOrigen.IdColor,
          IdMemoria: invOrigen.IdMemoria,
          IdBateria: invOrigen.IdBateria,
          IdAlmacenamiento: invOrigen.IdAlmacenamiento
        }, { transaction: t });
      }

      const movIngreso = await MovimientoStock.create({
        Fecha: new Date(),
        TipoMovimiento: 'Ingreso por Traspaso',
        Cantidad: data.Cantidad,
        IdInventario: invDestino.Id,
        IdEmpleado: data.IdEmpleado || 1
      }, { transaction: t });

      const transferencia = await Transferencia.create({
        IdSucursalOrigen: data.IdSucursalOrigen,
        IdSucursalDestino: data.IdSucursalDestino,
        IdMovimientoSalida: movSalida.id || movSalida.Id,
        IdMovimientoIngreso: movIngreso.id || movIngreso.Id
      }, { transaction: t });

      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `Traspaso ejecutado Id=${transferencia.Id || transferencia.id || ''}`,
        Accion: 'Ejecutar Traspaso',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursalOrigen || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return transferencia;

    } catch (error) {
      await t.rollback();
      await registerAudit(this.bitacoraService, {
        detalle: `Error en ejecutarTraspaso: ${error.message}`,
        Accion: 'Ejecutar Traspaso Error',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursalOrigen || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw error;
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.transferenciaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Transferencia no encontrada (Id=${id})`,
        Accion: 'Actualizar Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Transferencia no encontrada');
    }
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    if (data.IdSucursalOrigen !== undefined) {
      const sucOri = await Sucursal.findByPk(data.IdSucursalOrigen);
      if (!sucOri) {
        await registerAudit(this.bitacoraService, {
          detalle: `Sucursal origen no encontrada Id=${data.IdSucursalOrigen}`,
          Accion: 'Actualizar Transferencia',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Sucursal origen no encontrada');
      }
    }
    if (data.IdSucursalDestino !== undefined) {
      const sucDest = await Sucursal.findByPk(data.IdSucursalDestino);
      if (!sucDest) {
        await registerAudit(this.bitacoraService, {
          detalle: `Sucursal destino no encontrada Id=${data.IdSucursalDestino}`,
          Accion: 'Actualizar Transferencia',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Sucursal destino no encontrada');
      }
    }
    if (data.IdMovimientoSalida !== undefined) {
      const movOut = await MovimientoStock.findByPk(data.IdMovimientoSalida);
      if (!movOut) {
        await registerAudit(this.bitacoraService, {
          detalle: `Movimiento salida no encontrado Id=${data.IdMovimientoSalida}`,
          Accion: 'Actualizar Transferencia',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Movimiento salida no encontrado');
      }
    }
    if (data.IdMovimientoIngreso !== undefined) {
      const movIn = await MovimientoStock.findByPk(data.IdMovimientoIngreso);
      if (!movIn) {
        await registerAudit(this.bitacoraService, {
          detalle: `Movimiento ingreso no encontrado Id=${data.IdMovimientoIngreso}`,
          Accion: 'Actualizar Transferencia',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Movimiento ingreso no encontrado');
      }
    }

    const updated = await this.transferenciaDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Transferencia actualizada Id=${id}`,
      Accion: 'Actualizar Transferencia',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.transferenciaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Transferencia no encontrada (Id=${id})`,
        Accion: 'Eliminar Transferencia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Transferencia no encontrada');
    }
    const removed = await this.transferenciaDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Transferencia eliminada Id=${id}`,
      Accion: 'Eliminar Transferencia',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

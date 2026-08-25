export default class TransferenciaService {
  constructor(transferenciaDAO) {
    this.transferenciaDAO = transferenciaDAO;
    this.ATTRIBUTES = { };
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

  async getById(id) {
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    const item = await this.transferenciaDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: Sucursal, as: 'sucursalOrigen', attributes: ['Id', 'Nombre'] },
      { model: Sucursal, as: 'sucursalDestino', attributes: ['Id', 'Nombre'] },
      { model: MovimientoStock, as: 'movimientoSalida', attributes: ['Id', 'Fecha'] },
      { model: MovimientoStock, as: 'movimientoIngreso', attributes: ['Id', 'Fecha'] }
    ] });
    if (!item) throw new Error('Transferencia no encontrada');
    return item;
  }

  async create(data) {
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    const sucOri = await Sucursal.findByPk(data.IdSucursalOrigen);
    if (!sucOri) throw new Error('Sucursal origen no encontrada');
    const sucDest = await Sucursal.findByPk(data.IdSucursalDestino);
    if (!sucDest) throw new Error('Sucursal destino no encontrada');
    const movOut = await MovimientoStock.findByPk(data.IdMovimientoSalida);
    if (!movOut) throw new Error('Movimiento salida no encontrado');
    const movIn = await MovimientoStock.findByPk(data.IdMovimientoIngreso);
    if (!movIn) throw new Error('Movimiento ingreso no encontrado');

    return await this.transferenciaDAO.create(data);
  }

  // Transacción: todo o nada.
  async ejecutarTraspaso(data) {
    const sequelize = this.transferenciaDAO.model.sequelize;
    const { Inventario, MovimientoStock, Transferencia, Articulo } = sequelize.models;

    const t = await sequelize.transaction();

    try {
      const invOrigen = await Inventario.findOne({
        where: { IdArticulo: data.IdArticulo, IdSucursal: data.IdSucursalOrigen },
        transaction: t
      });

      if (!invOrigen || invOrigen.Stock < data.Cantidad) {
        throw new Error('Stock insuficiente en la sucursal de origen');
      }

      const articulo = await Articulo.findByPk(data.IdArticulo, { transaction: t });
      let invDestino;

      if (articulo?.EsSerializado) {
        // Serializado (con IMEI): es una unidad física puntual, no se puede partir con
        // matemática de Stock. Se relocaliza la misma fila a la sucursal destino.
        if (Number(data.Cantidad) !== 1) {
          throw new Error('Los productos serializados (con IMEI) se transfieren de a una unidad: Cantidad debe ser 1.');
        }
        const yaExisteEnDestino = await Inventario.findOne({
          where: { IdArticulo: data.IdArticulo, IdSucursal: data.IdSucursalDestino },
          transaction: t
        });
        if (yaExisteEnDestino) {
          throw new Error('Ya existe un registro de este artículo serializado en la sucursal destino.');
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

      invDestino = await Inventario.findOne({
        where: { IdArticulo: data.IdArticulo, IdSucursal: data.IdSucursalDestino },
        transaction: t
      });

      if (invDestino) {
        await invDestino.update({ Stock: invDestino.Stock + data.Cantidad }, { transaction: t });
      } else {
        // Fila nueva: copia del origen los campos NOT NULL (garantías, proveedor, atributos).
        // No serializado => IMEI queda null.
        invDestino = await Inventario.create({
          IdArticulo: data.IdArticulo,
          IdSucursal: data.IdSucursalDestino,
          IdEstadoInventario: invOrigen.IdEstadoInventario,
          Stock: data.Cantidad,
          PrecioCosto: invOrigen.PrecioCosto,
          PrecioMayor: invOrigen.PrecioMayor,
          PrecioMenor: invOrigen.PrecioMenor,
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
      return transferencia;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async update(id, data) {
    const item = await this.transferenciaDAO.getById(id);
    if (!item) throw new Error('Transferencia no encontrada');
    const { Sucursal, MovimientoStock } = this._getRelatedModels();
    if (data.IdSucursalOrigen !== undefined) {
      const sucOri = await Sucursal.findByPk(data.IdSucursalOrigen);
      if (!sucOri) throw new Error('Sucursal origen no encontrada');
    }
    if (data.IdSucursalDestino !== undefined) {
      const sucDest = await Sucursal.findByPk(data.IdSucursalDestino);
      if (!sucDest) throw new Error('Sucursal destino no encontrada');
    }
    if (data.IdMovimientoSalida !== undefined) {
      const movOut = await MovimientoStock.findByPk(data.IdMovimientoSalida);
      if (!movOut) throw new Error('Movimiento salida no encontrado');
    }
    if (data.IdMovimientoIngreso !== undefined) {
      const movIn = await MovimientoStock.findByPk(data.IdMovimientoIngreso);
      if (!movIn) throw new Error('Movimiento ingreso no encontrado');
    }

    return await this.transferenciaDAO.update(id, data);
  }

  async remove(id) {
    const item = await this.transferenciaDAO.getById(id);
    if (!item) throw new Error('Transferencia no encontrada');
    return await this.transferenciaDAO.remove(id);
  }
}

import { registerAudit } from '../../../core/utils/audit.util.js';
import { resolverListasPrecioCategoria, reprecificarInventario } from '../../../core/utils/precios.util.js';
import logger from '../../../core/utils/logger.js';

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const bizError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export default class CompraService {
  constructor(compraDAO, detalleCompraDAO, cuentaCorrienteProveedorService, bitacoraService = null, cajaService = null) {
    this.compraDAO = compraDAO;
    this.detalleCompraDAO = detalleCompraDAO;
    this.cuentaCorrienteProveedorService = cuentaCorrienteProveedorService;
    this.bitacoraService = bitacoraService;
    this.cajaService = cajaService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.compraDAO.getAll({ page, limit });
  }

  async getById(id) {
    const sequelize = this.compraDAO.model.sequelize;
    const { DetalleCompra, Proveedor, Inventario, Articulo } = sequelize.models;
    const compra = await this.compraDAO.getById(id, {
      include: [
        {
          model: DetalleCompra, as: 'detalles',
          // El nombre del producto vive en Articulo, no en Inventario (que es solo el
          // renglón de stock) — DetalleCompra.inventario -> Inventario.articulo -> Nombre.
          include: [{
            model: Inventario, as: 'inventario',
            include: [{ model: Articulo, as: 'articulo', attributes: ['Id', 'Nombre'] }]
          }]
        },
        { model: Proveedor, as: 'proveedor', attributes: ['Id', 'Nombre'] }
      ]
    });
    if (!compra) throw bizError('Compra no encontrada', 404);
    return compra;
  }

  // Resuelve el/los Inventario de un renglón de compra: incrementa uno existente o
  // crea uno nuevo (uno por IMEI si el producto es serializado). Corre dentro de la
  // transacción `t`. Devuelve [{ inventario, cantidadDetalle }].
  async _resolverInventarios(item, cabecera, models, t) {
    const { Inventario, Articulo } = models;

    // --- Caso A: renglón sobre un Inventario ya existente -> incrementar Stock ---
    if (item.IdInventario) {
      const inventario = await Inventario.findByPk(item.IdInventario, { transaction: t, lock: t.LOCK.UPDATE });
      if (!inventario) throw bizError(`Inventario no encontrado (Id=${item.IdInventario}).`, 404);

      const articulo = await Articulo.findByPk(inventario.IdArticulo, { transaction: t });
      if (articulo?.EsSerializado) {
        throw bizError(
          `El Inventario Id=${item.IdInventario} corresponde a un producto serializado (con IMEI): no se le puede ` +
          `incrementar el stock. Cada unidad serializada debe cargarse como un renglón nuevo con su propio IMEI.`
        );
      }

      await inventario.increment('Stock', { by: item.Cantidad, transaction: t });
      await inventario.reload({ transaction: t });
      return [{ inventario, cantidadDetalle: item.Cantidad }];
    }

    // --- Caso B: renglón que crea Inventario nuevo a partir de un Articulo existente ---
    if (!item.IdArticulo) {
      throw bizError('Cada renglón de la compra debe indicar "IdInventario" (existente) o "IdArticulo" (para crear uno nuevo).');
    }

    const articulo = await Articulo.findByPk(item.IdArticulo, { transaction: t });
    if (!articulo) throw bizError(`Articulo no encontrado (Id=${item.IdArticulo}).`, 404);

    const baseData = {
      CreatedAt: new Date(),
      MesesGarantiaMarca: item.MesesGarantiaMarca ? new Date(item.MesesGarantiaMarca) : null,
      Observaciones: item.Observaciones || null,
      IdSucursal: cabecera.IdSucursalDestino,
      IdArticulo: item.IdArticulo,
      IdEstadoInventario: 1, // la compra siempre ingresa stock "nuevo" del proveedor
      IdProveedor: cabecera.IdProveedor,
      IdColor: item.IdColor || null,
      IdMemoria: item.IdMemoria || null,
      IdBateria: item.IdBateria || null,
      IdAlmacenamiento: item.IdAlmacenamiento || null
    };

    if (articulo.EsSerializado) {
      // Cada unidad serializada es su propia fila (Stock:1, identificada por IMEI). El
      // índice único filtrado UQ_Inventario_SucursalProducto (WHERE IMEI IS NULL) no
      // aplica acá, así que pueden convivir varias filas del mismo Sucursal+Producto+Estado.
      const imeis = item.IMEIs || [];
      if (imeis.length !== Number(item.Cantidad)) {
        throw bizError(
          `El producto Id=${item.IdArticulo} es serializado (requiere IMEI): se esperaban ${item.Cantidad} IMEIs ` +
          `(uno por unidad, campo "IMEIs") y se recibieron ${imeis.length}.`
        );
      }
      if (!item.MesesGarantiaLocal) {
        throw bizError(`Falta "MesesGarantiaLocal" para el renglón de IdArticulo=${item.IdArticulo} (requerido al crear un Inventario nuevo).`);
      }

      const resultado = [];
      for (const imei of imeis) {
        const existente = await Inventario.findOne({ where: { IMEI: imei }, transaction: t });
        if (existente) {
          throw bizError(`Ya existe un Inventario con el IMEI ${imei} (Id=${existente.Id}). No se puede repetir en la compra.`, 409);
        }
        const inventario = await Inventario.create({
          ...baseData,
          IMEI: imei,
          Stock: 1,
          MesesGarantiaLocal: new Date(item.MesesGarantiaLocal)
        }, { transaction: t });
        resultado.push({ inventario, cantidadDetalle: 1 });
      }
      return resultado;
    }

    // No serializado: la base exige una sola fila por Sucursal+Producto+Estado
    // (UQ_Inventario_SucursalProducto, filtrada a IMEI NULL) -> si ya existe, incrementa.
    const existente = await Inventario.findOne({
      where: { IdSucursal: cabecera.IdSucursalDestino, IdArticulo: item.IdArticulo, IdEstadoInventario: 1, IMEI: null },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (existente) {
      await existente.increment('Stock', { by: item.Cantidad, transaction: t });
      await existente.reload({ transaction: t });
      return [{ inventario: existente, cantidadDetalle: item.Cantidad }];
    }

    if (!item.MesesGarantiaLocal) {
      throw bizError(`Falta "MesesGarantiaLocal" para el renglón de IdArticulo=${item.IdArticulo} (requerido al crear un Inventario nuevo).`);
    }
    const inventario = await Inventario.create({
      ...baseData,
      Stock: item.Cantidad,
      MesesGarantiaLocal: new Date(item.MesesGarantiaLocal)
    }, { transaction: t });
    return [{ inventario, cantidadDetalle: item.Cantidad }];
  }

  // Resuelve las listas de precio de la categoría y deja el precio del renglón de
  // Inventario en cada una (minorista + mayorista) con el costo de compra como CostoBase.
  // Misma lógica que usa el alta directa de Inventario (canje) — ver core/utils/precios.util.js.
  async _reprecificarPorCompra(inventarioId, idCategoria, costoUnitario, sequelize, t, advertencias) {
    const listas = await resolverListasPrecioCategoria(sequelize, idCategoria, t);
    if (!listas.length) throw bizError('No existe ninguna lista de precios (ni la Id=1 por defecto).', 500);
    if (idCategoria && !listas.some((l) => Number(l.IdCategoriaProducto) === Number(idCategoria))) {
      advertencias.push(`No hay lista de precios activa para la categoría ${idCategoria}. Se usó la lista por defecto (Id=1).`);
    }
    return reprecificarInventario(sequelize, { IdInventario: inventarioId, CostoBase: costoUnitario, listas }, t);
  }

  // Registra la compra completa en una única transacción: cabecera (con su estado
  // financiero calculado), Detalles[] (Inventario + MovimientoStock + DetalleCompra +
  // PrecioArticulo), la deuda en CuentaCorrienteProveedor (siempre) y los Pagos[]
  // iniciales (PagoCompra + Haber en cuenta corriente por cada uno).
  async create(data, auditContext = null) {
    const sequelize = this.compraDAO.model.sequelize;
    const t = await sequelize.transaction();
    const advertencias = [];

    try {
      const {
        Proveedor, Usuario, Sucursal, TurnoCaja, MetodoPago,
        Inventario, Articulo, ModeloArticulo, ListaPrecio, PrecioArticulo,
        MovimientoStock, DetalleCompra, PagoCompra
      } = sequelize.models;
      const models = { Inventario, Articulo, ModeloArticulo, ListaPrecio, PrecioArticulo };

      // 1. Validar cabecera (mensajes de negocio limpios en vez de error crudo de FK).
      const proveedor = await Proveedor.findByPk(data.IdProveedor, { transaction: t });
      if (!proveedor) throw bizError(`Proveedor no encontrado (Id=${data.IdProveedor}).`, 404);
      const empleado = await Usuario.findByPk(data.IdEmpleado, { transaction: t });
      if (!empleado) throw bizError(`Empleado no encontrado (Id=${data.IdEmpleado}).`, 404);
      const sucursal = await Sucursal.findByPk(data.IdSucursalDestino, { transaction: t });
      if (!sucursal) throw bizError(`Sucursal no encontrada (Id=${data.IdSucursalDestino}).`, 404);

      // 2. Totales: el backend es la única fuente de verdad, nunca confía en el body.
      const detallesInput = data.Detalles;
      const pagosInput = data.Pagos || [];

      const totalCosto = round2(detallesInput.reduce(
        (acc, item) => acc + Number(item.Cantidad) * Number(item.PrecioCostoUnitario), 0
      ));
      const totalPagado = round2(pagosInput.reduce((acc, p) => acc + Number(p.Monto), 0));

      if (totalPagado > totalCosto) {
        throw bizError(`El total de los pagos (${totalPagado}) no puede superar el total de la compra (${totalCosto}).`);
      }

      // 3. Turno de caja y métodos de pago: solo si hay pagos iniciales.
      if (pagosInput.length > 0) {
        if (!data.IdTurnoCaja) throw bizError('Falta "IdTurnoCaja" (requerido para registrar los pagos iniciales de la compra).');
        const turno = await TurnoCaja.findByPk(data.IdTurnoCaja, { transaction: t });
        if (!turno) throw bizError(`Turno de caja no encontrado (Id=${data.IdTurnoCaja}).`, 404);
        for (const pago of pagosInput) {
          const metodo = await MetodoPago.findByPk(pago.IdMetodoPago, { transaction: t });
          if (!metodo) throw bizError(`Método de pago no encontrado (Id=${pago.IdMetodoPago}).`, 404);
        }
      }

      // 4. SaldoPendiente / EstadoPago (TotalPagado=0 manda primero).
      const saldoPendiente = round2(totalCosto - totalPagado);
      const estadoPago = totalPagado === 0 ? 1 : (totalPagado < totalCosto ? 2 : 3);

      const compra = await this.compraDAO.create({
        Fecha: data.Fecha ? new Date(data.Fecha) : new Date(),
        TotalCosto: totalCosto,
        EstadoPago: estadoPago,
        SaldoPendiente: saldoPendiente,
        IdProveedor: data.IdProveedor,
        IdSucursalDestino: data.IdSucursalDestino,
        IdEmpleado: data.IdEmpleado
      }, { transaction: t });

      // 5. Detalles: Inventario + MovimientoStock + DetalleCompra + PrecioArticulo.
      //    La mercadería ingresa al 100% sin importar la modalidad de pago.
      for (const item of detallesInput) {
        const resueltos = await this._resolverInventarios(item, data, models, t);

        for (const { inventario, cantidadDetalle } of resueltos) {
          // Auditoría de stock: historial inmutable del ingreso físico.
          await MovimientoStock.create({
            Fecha: new Date(),
            TipoMovimiento: 'Ingreso por Compra',
            Cantidad: cantidadDetalle,
            Observaciones: `Compra Id=${compra.Id}`,
            IdInventario: inventario.Id,
            IdEmpleado: data.IdEmpleado
          }, { transaction: t });

          // El atributo se llama IdArticulo pero mapea a la columna IdInventario.
          await this.detalleCompraDAO.create({
            IdCompra: compra.Id,
            IdArticulo: inventario.Id,
            Cantidad: cantidadDetalle,
            PrecioCostoUnitario: item.PrecioCostoUnitario
          }, { transaction: t });

          const articulo = await Articulo.findByPk(inventario.IdArticulo, { transaction: t });
          const modelo = await ModeloArticulo.findByPk(articulo.IdModeloArticulo, { transaction: t });

          await this._reprecificarPorCompra(inventario.Id, modelo?.IdCategoriaArticulo, item.PrecioCostoUnitario, sequelize, t, advertencias);
        }
      }

      // 6. Cuenta corriente: la compra genera la deuda completa, siempre.
      await this.cuentaCorrienteProveedorService.registrarDeuda(
        { IdProveedor: data.IdProveedor, IdCompra: compra.Id, Monto: totalCosto },
        { transaction: t }
      );

      // 7. Pagos iniciales: PagoCompra + Haber en cuenta corriente por cada uno.
      for (const pago of pagosInput) {
        const pagoCompra = await PagoCompra.create({
          Monto: round2(pago.Monto),
          FechaPago: pago.FechaPago ? new Date(pago.FechaPago) : new Date(),
          IdCompra: compra.Id,
          IdMetodoPago: pago.IdMetodoPago,
          IdTurnoCaja: data.IdTurnoCaja
        }, { transaction: t });

        await this.cuentaCorrienteProveedorService.registrarPago(
          { IdProveedor: data.IdProveedor, IdCompra: compra.Id, IdPagoCompra: pagoCompra.Id, Monto: round2(pago.Monto) },
          { transaction: t }
        );

        if (this.cajaService) {
          await this.cajaService.registrarEgreso({
            IdTurnoCaja: data.IdTurnoCaja,
            IdEmpleado: data.IdEmpleado,
            Monto: pagoCompra.Monto,
            Descripcion: `Pago de compra Id=${compra.Id}`,
            Fecha: pagoCompra.FechaPago
          }, { transaction: t });
        }
      }

      await t.commit();

      const creada = await this.compraDAO.getById(compra.Id, {
        include: [{ model: DetalleCompra, as: 'detalles' }]
      });

      await registerAudit(this.bitacoraService, {
        detalle: `Compra registrada Id=${compra.Id} (TotalCosto=${totalCosto}, EstadoPago=${estadoPago})`,
        Accion: 'Crear Compra',
        IdEmpleado: data.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data.IdSucursalDestino || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});

      return { compra: creada, totalPagado, advertencias };
    } catch (err) {
      await t.rollback();
      if (err.statusCode) throw err; // error de negocio ya tipado -> se respeta su status
      logger.error('❌ Error registrando compra transaccional:', err);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al registrar la compra';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw bizError('Compra no encontrada', 404);
    return await this.compraDAO.update(id, data);
  }

  async delete(id) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw bizError('Compra no encontrada', 404);
    const eliminado = await this.compraDAO.remove(id);
    if (!eliminado) throw bizError('No se pudo eliminar la compra', 500);
    return true;
  }
}

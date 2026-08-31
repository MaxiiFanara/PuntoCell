import { registerAudit } from '../../../core/utils/audit.util.js';

const round2 = (value) => Number(Number(value || 0).toFixed(2));

export default class CompraService {
  constructor(compraDAO, detalleCompraDAO, cuentaCorrienteProveedorService, bitacoraService = null) {
    this.compraDAO = compraDAO;
    this.detalleCompraDAO = detalleCompraDAO;
    this.cuentaCorrienteProveedorService = cuentaCorrienteProveedorService;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.compraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');
    return compra;
  }

  // Resuelve el/los Inventario de un renglón de compra: incrementa uno existente
  // o crea uno nuevo (uno por IMEI si el producto es serializado). Corre dentro
  // de la transacción `t` de create().
  async _resolverInventarios(item, cabecera, models, t) {
    const { Inventario, Articulo } = models;

    if (item.IdInventario) {
      const inventario = await Inventario.findByPk(item.IdInventario, { transaction: t, lock: t.LOCK.UPDATE });
      if (!inventario) throw new Error(`Inventario no encontrado (Id=${item.IdInventario}).`);

      const articulo = await Articulo.findByPk(inventario.IdArticulo, { transaction: t });
      if (articulo?.EsSerializado) {
        throw new Error(
          `El Inventario Id=${item.IdInventario} corresponde a un producto serializado (con IMEI): no se le puede ` +
          `incrementar el stock. Cada unidad serializada debe cargarse como un renglón nuevo con su propio IMEI.`
        );
      }

      await inventario.increment('Stock', { by: item.Cantidad, transaction: t });
      await inventario.reload({ transaction: t });
      return [{ inventario, cantidadDetalle: item.Cantidad }];
    }

    if (!item.IdArticulo) {
      throw new Error('Cada renglón de la compra debe indicar "IdInventario" (existente) o "IdArticulo" (para crear uno nuevo).');
    }

    const articulo = await Articulo.findByPk(item.IdArticulo, { transaction: t });
    if (!articulo) throw new Error(`Articulo no encontrado (Id=${item.IdArticulo}).`);

    const baseData = {
      CreatedAt: new Date(),
      MesesGarantiaMarca: item.MesesGarantiaMarca ? new Date(item.MesesGarantiaMarca) : null,
      Observaciones: item.Observaciones || null,
      IdSucursal: cabecera.IdSucursalDestino,
      IdArticulo: item.IdArticulo,
      IdEstadoInventario: 1, // "nuevo" — la compra siempre ingresa stock nuevo del proveedor
      IdProveedor: cabecera.IdProveedor,
      IdColor: item.IdColor || null,
      IdMemoria: item.IdMemoria || null,
      IdBateria: item.IdBateria || null,
      IdAlmacenamiento: item.IdAlmacenamiento || null
    };

    if (articulo.EsSerializado) {
      // Cada unidad serializada es su propia fila (Stock:1, identificada por IMEI) —
      // el índice único filtrado UQ_Inventario_SucursalProducto (WHERE IMEI IS NULL)
      // no aplica acá, así que pueden convivir varias filas para el mismo
      // Sucursal+Producto+Estado.
      const imeis = item.IMEIs || [];
      if (imeis.length !== Number(item.Cantidad)) {
        throw new Error(
          `El producto Id=${item.IdArticulo} es serializado (requiere IMEI): se esperaban ${item.Cantidad} IMEIs ` +
          `(uno por unidad, campo "IMEIs") y se recibieron ${imeis.length}.`
        );
      }
      if (!item.MesesGarantiaLocal) {
        throw new Error(`Falta "MesesGarantiaLocal" para el renglón de IdArticulo=${item.IdArticulo} (requerido al crear un Inventario nuevo).`);
      }

      const resultado = [];
      for (const imei of imeis) {
        const existente = await Inventario.findOne({ where: { IMEI: imei }, transaction: t });
        if (existente) {
          throw new Error(`Ya existe un Inventario con el IMEI ${imei} (Id=${existente.Id}). No se puede repetir en la misma compra.`);
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
    // (UQ_Inventario_SucursalProducto, filtrada a IMEI NULL) — si ya existe, se
    // incrementa en vez de insertar una segunda.
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
      throw new Error(`Falta "MesesGarantiaLocal" para el renglón de IdArticulo=${item.IdArticulo} (requerido al crear un Inventario nuevo).`);
    }
    const inventario = await Inventario.create({
      ...baseData,
      Stock: item.Cantidad,
      MesesGarantiaLocal: new Date(item.MesesGarantiaLocal)
    }, { transaction: t });
    return [{ inventario, cantidadDetalle: item.Cantidad }];
  }

  // Resuelve la ListaPrecio vigente para una categoría, con fallback a la Id=1
  // (default) si no hay ninguna activa asociada a esa categoría. Acumula advertencias.
  // Importante: IdCategoriaProducto NUNCA se usa como IdListaPrecio — se busca la fila
  // de ListaPrecio cuyo IdCategoriaProducto coincida y se usa el Id real de esa fila.
  async _resolverListaPrecio(idCategoria, models, t, advertencias) {
    const { ListaPrecio } = models;

    let lista = await ListaPrecio.findOne({
      where: { IdCategoriaProducto: idCategoria, Activo: true },
      order: [['Id', 'DESC']],
      transaction: t
    });

    if (!lista) {
      advertencias.push(`No existe una lista de precio registrada para la categoría ${idCategoria}. Se utilizará la lista de precios por defecto (Id=1).`);
      lista = await ListaPrecio.findByPk(1, { transaction: t });
      if (!lista) throw new Error('No existe la lista de precios por defecto (Id=1).');
    }

    if (!lista.Activo) {
      advertencias.push(`La lista de precios "${lista.Nombre}" (Id=${lista.Id}) está inactiva; igual se usó para calcular el precio del artículo.`);
    }

    return lista;
  }

  // Registra la compra completa dentro de una única transacción: cabecera (con su
  // estado financiero), Detalles[] (Inventario + DetalleCompra + PrecioArticulo),
  // la deuda en CuentaCorrienteProveedor (siempre, aunque se pague todo al contado)
  // y los Pagos[] iniciales (PagoCompra + Haber en cuenta corriente por cada uno).
  async create(data, auditContext = null) {
    const sequelize = this.compraDAO.model.sequelize;
    const t = await sequelize.transaction();
    const advertencias = [];

    try {
      const { Proveedor, Usuario, Sucursal, TurnoCaja, MetodoPago, Inventario, Articulo, ModeloArticulo, DetalleCompra, ListaPrecio, PrecioArticulo } = sequelize.models;
      const models = { Inventario, Articulo, ModeloArticulo, ListaPrecio, PrecioArticulo };

      // 1. Validar existencia de cabecera (mensajes de negocio limpios en vez de
      // depender del SequelizeForeignKeyConstraintError, que en este endpoint
      // transaccional cae como 500 con el mensaje crudo de SQL Server).
      const proveedor = await Proveedor.findByPk(data.IdProveedor, { transaction: t });
      if (!proveedor) throw new Error(`Proveedor no encontrado (Id=${data.IdProveedor}).`);
      const empleado = await Usuario.findByPk(data.IdEmpleado, { transaction: t });
      if (!empleado) throw new Error(`Empleado no encontrado (Id=${data.IdEmpleado}).`);
      const sucursal = await Sucursal.findByPk(data.IdSucursalDestino, { transaction: t });
      if (!sucursal) throw new Error(`Sucursal no encontrada (Id=${data.IdSucursalDestino}).`);

      // 2. Calcular TotalCosto y TotalPagado — el backend es la única fuente de verdad,
      // nunca se confía en un TotalCosto/TotalPagado/SaldoPendiente/EstadoPago del body.
      const detallesInput = data.Detalles;
      const pagosInput = data.Pagos || [];

      const totalCosto = round2(detallesInput.reduce(
        (acc, item) => acc + Number(item.Cantidad) * Number(item.PrecioCostoUnitario),
        0
      ));
      const totalPagado = round2(pagosInput.reduce((acc, p) => acc + Number(p.Monto), 0));

      if (totalPagado > totalCosto) {
        throw new Error(`El total de los pagos (${totalPagado}) no puede superar el total de la compra (${totalCosto}).`);
      }

      // 3. Validar turno de caja y método de pago solo si hay pagos iniciales.
      if (pagosInput.length > 0) {
        if (!data.IdTurnoCaja) {
          throw new Error('Falta "IdTurnoCaja" (requerido para registrar los pagos iniciales de la compra).');
        }
        const turno = await TurnoCaja.findByPk(data.IdTurnoCaja, { transaction: t });
        if (!turno) throw new Error(`Turno de caja no encontrado (Id=${data.IdTurnoCaja}).`);

        for (const pago of pagosInput) {
          const metodo = await MetodoPago.findByPk(pago.IdMetodoPago, { transaction: t });
          if (!metodo) throw new Error(`Método de pago no encontrado (Id=${pago.IdMetodoPago}).`);
        }
      }

      // 4. Determinar SaldoPendiente y EstadoPago (orden literal pedido por el analista:
      // TotalPagado=0 manda primero, así se evita la ambigüedad de una compra en $0).
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

      // 5. Detalles: resolver/crear Inventario, DetalleCompra y PrecioArticulo por
      // cada renglón — la mercadería ingresa al 100% sin importar la modalidad de pago.
      for (const item of detallesInput) {
        const resueltos = await this._resolverInventarios(item, data, models, t);

        for (const { inventario, cantidadDetalle } of resueltos) {
          // El atributo se llama IdArticulo pero mapea a la columna IdInventario
          // (ver detalle-compra.model.js) — acá guarda el Id del renglón de Inventario.
          await this.detalleCompraDAO.create({
            IdCompra: compra.Id,
            IdArticulo: inventario.Id,
            Cantidad: cantidadDetalle,
            PrecioCostoUnitario: item.PrecioCostoUnitario
          }, { transaction: t });

          const articulo = await Articulo.findByPk(inventario.IdArticulo, { transaction: t });
          const modelo = await ModeloArticulo.findByPk(articulo.IdModeloArticulo, { transaction: t });
          const lista = await this._resolverListaPrecio(modelo?.IdCategoriaArticulo, models, t, advertencias);

          const CostoBase = round2(item.PrecioCostoUnitario);
          const CostosVariables = round2(CostoBase * 0.26);
          const CostoReal = round2(CostoBase + CostosVariables);
          const PorcentajeGanancia = Number(lista.PorcentajeRentabilidad || 0);
          const ValorFinal = round2(CostoReal * (1 + PorcentajeGanancia / 100));

          await PrecioArticulo.create({
            IdInventario: inventario.Id,
            IdListaPrecio: lista.Id,
            CostoBase,
            CostosVariables,
            CostoReal,
            PorcentajeGanancia,
            ValorFinal,
            FechaDesde: new Date(),
            FechaHasta: null
          }, { transaction: t });
        }
      }

      // 6. Cuenta corriente: la compra genera la deuda completa, siempre — incluso si
      // se paga 100% al contado (el pago la cancela en el paso siguiente, no la evita).
      await this.cuentaCorrienteProveedorService.registrarDeuda(
        { IdProveedor: data.IdProveedor, IdCompra: compra.Id, Monto: totalCosto },
        t
      );

      // 7. Pagos iniciales: PagoCompra + Haber en cuenta corriente por cada uno.
      for (const pago of pagosInput) {
        const pagoCompra = await sequelize.models.PagoCompra.create({
          Monto: round2(pago.Monto),
          FechaPago: pago.FechaPago ? new Date(pago.FechaPago) : new Date(),
          IdCompra: compra.Id,
          IdMetodoPago: pago.IdMetodoPago,
          IdTurnoCaja: data.IdTurnoCaja
        }, { transaction: t });

        await this.cuentaCorrienteProveedorService.registrarPago(
          { IdProveedor: data.IdProveedor, IdCompra: compra.Id, IdPagoCompra: pagoCompra.Id, Monto: round2(pago.Monto) },
          t
        );
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
      console.error('❌ Error registrando compra transactional:', err);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al registrar la compra';
      throw new Error(message);
    }
  }

  async update(id, data) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');

    return await this.compraDAO.update(id, data);
  }

  async delete(id) {
    const compra = await this.compraDAO.getById(id);
    if (!compra) throw new Error('Compra no encontrada');

    // Eliminación física
    const eliminado = await this.compraDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la compra');
    return true;
  }
}

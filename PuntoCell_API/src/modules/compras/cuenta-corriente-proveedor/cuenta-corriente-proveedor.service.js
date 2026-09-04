import { auditar } from '../../../core/utils/audit.util.js';

// Conceptos válidos: SIEMPRE los fija el backend, nunca llegan como texto libre del frontend.
export const CONCEPTOS = {
  FACTURA_COMPRA: 'Factura de Compra',
  PAGO: 'Pago a cuenta/total',
  NOTA_CREDITO_DEVOLUCION: 'Nota de Crédito por Devolución',
  AJUSTE: 'Ajuste manual'
};

export default class CuentaCorrienteProveedorService {
  constructor(cuentaCorrienteProveedorDAO, proveedorDAO = null, bitacoraService = null) {
    this.dao = cuentaCorrienteProveedorDAO;
    this.proveedorDAO = proveedorDAO;
    this.bitacoraService = bitacoraService;
  }

  round2(value) {
    return Number(Number(value || 0).toFixed(2));
  }

  async getAll(query = {}) {
    const { page, limit, IdProveedor } = query;
    const where = {};
    if (IdProveedor) where.IdProveedor = Number(IdProveedor);
    return this.dao.getAll({
      page,
      limit,
      where,
      order: [['FechaMovimiento', 'ASC'], ['Id', 'ASC']]
    });
  }

  async getById(id) {
    const movimiento = await this.dao.getById(id);
    if (!movimiento) {
      const err = new Error('Movimiento de cuenta corriente no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return movimiento;
  }

  // Saldo actual del proveedor = SaldoAcumulado del último movimiento (0 si no tiene).
  async getSaldoActual(idProveedor, options = {}) {
    const ultimo = await this.dao.findOne({
      where: { IdProveedor: Number(idProveedor) },
      order: [['FechaMovimiento', 'DESC'], ['Id', 'DESC']],
      ...options
    });
    return ultimo ? Number(ultimo.SaldoAcumulado) : 0;
  }

  // Historial cronológico + saldo actual, para el detalle del proveedor.
  async getResumenProveedor(idProveedor) {
    await this._assertProveedor(idProveedor);
    const movimientos = await this.dao.getAll({
      where: { IdProveedor: Number(idProveedor) },
      order: [['FechaMovimiento', 'ASC'], ['Id', 'ASC']]
    });
    const saldoActual = movimientos.length
      ? Number(movimientos[movimientos.length - 1].SaldoAcumulado)
      : 0;
    return { IdProveedor: Number(idProveedor), saldoActual, movimientos };
  }

  // Punto de entrada canónico para asentar un movimiento. Lo usan (o usarán) los
  // flujos de Compra / PagoCompra / DevolucionCompra pasándole su propia transacción
  // vía `options`. Calcula SaldoAcumulado a partir del último movimiento del proveedor.
  async registrarMovimiento(
    { IdProveedor, Concepto, Debe = 0, Haber = 0, IdCompra = null, IdPagoCompra = null, FechaMovimiento = null },
    options = {}
  ) {
    if (!IdProveedor) {
      const err = new Error('IdProveedor es obligatorio');
      err.statusCode = 400;
      throw err;
    }
    if (!Concepto) {
      const err = new Error('Concepto es obligatorio');
      err.statusCode = 400;
      throw err;
    }

    const debe = this.round2(Debe);
    const haber = this.round2(Haber);
    const saldoOptions = options.transaction ? { transaction: options.transaction } : {};
    const saldoPrevio = await this.getSaldoActual(IdProveedor, saldoOptions);
    const saldoAcumulado = this.round2(saldoPrevio + debe - haber);

    return this.dao.create({
      IdProveedor: Number(IdProveedor),
      FechaMovimiento: FechaMovimiento ? new Date(FechaMovimiento) : new Date(),
      Concepto,
      Debe: debe,
      Haber: haber,
      SaldoAcumulado: saldoAcumulado,
      IdCompra,
      IdPagoCompra
    }, options);
  }

  // Saldo global del proveedor en formato liviano { IdProveedor, Saldo }.
  async getSaldoPorProveedor(idProveedor) {
    await this._assertProveedor(idProveedor);
    const saldo = await this.getSaldoActual(idProveedor);
    return { IdProveedor: Number(idProveedor), Saldo: saldo };
  }

  // Helpers semánticos que fijan el Concepto. Pensados para el módulo de Compras.
  // `registrarDeuda` es el alias que usa CompraService (misma semántica que registrarFacturaCompra).
  registrarDeuda({ IdProveedor, Monto, IdCompra, FechaMovimiento = null }, options = {}) {
    return this.registrarFacturaCompra({ IdProveedor, Monto, IdCompra, FechaMovimiento }, options);
  }

  registrarFacturaCompra({ IdProveedor, Monto, IdCompra, FechaMovimiento = null }, options = {}) {
    return this.registrarMovimiento(
      { IdProveedor, Concepto: CONCEPTOS.FACTURA_COMPRA, Debe: Monto, IdCompra, FechaMovimiento },
      options
    );
  }

  registrarPago({ IdProveedor, Monto, IdCompra = null, IdPagoCompra, FechaMovimiento = null }, options = {}) {
    return this.registrarMovimiento(
      { IdProveedor, Concepto: CONCEPTOS.PAGO, Haber: Monto, IdCompra, IdPagoCompra, FechaMovimiento },
      options
    );
  }

  registrarNotaCredito({ IdProveedor, Monto, IdCompra, FechaMovimiento = null }, options = {}) {
    return this.registrarMovimiento(
      { IdProveedor, Concepto: CONCEPTOS.NOTA_CREDITO_DEVOLUCION, Haber: Monto, IdCompra, FechaMovimiento },
      options
    );
  }

  // Ajuste manual desde la API: el único movimiento que se origina en el frontend.
  // El front solo dice si suma o resta deuda y por cuánto; el Concepto lo arma el backend.
  async registrarAjuste(idProveedor, { tipo, Monto, Detalle } = {}, ctx = null) {
    await this._assertProveedor(idProveedor);
    const detalle = (Detalle || '').trim();
    const concepto = detalle ? `${CONCEPTOS.AJUSTE}: ${detalle}` : CONCEPTOS.AJUSTE;
    const mov = await this.registrarMovimiento({
      IdProveedor: Number(idProveedor),
      Concepto: concepto,
      Debe: tipo === 'debe' ? Monto : 0,
      Haber: tipo === 'haber' ? Monto : 0
    });
    await auditar(this.bitacoraService, ctx,
      `Ajuste manual en cuenta corriente del proveedor #${idProveedor} (${tipo} ${Monto})`,
      `${concepto} · saldo resultante ${mov.SaldoAcumulado}`);
    return mov;
  }

  async _assertProveedor(idProveedor) {
    if (!this.proveedorDAO) return;
    const proveedor = await this.proveedorDAO.getById(idProveedor);
    if (!proveedor) {
      const err = new Error('Proveedor no encontrado');
      err.statusCode = 404;
      throw err;
    }
  }
}

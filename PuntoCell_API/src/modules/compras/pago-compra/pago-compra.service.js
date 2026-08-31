import { auditar } from '../../../core/utils/audit.util.js';

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const bizError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export default class PagoCompraService {
  constructor(pagoCompraDAO, cuentaCorrienteProveedorService, bitacoraService = null) {
    this.pagoCompraDAO = pagoCompraDAO;
    this.cuentaCorrienteProveedorService = cuentaCorrienteProveedorService;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoCompraDAO.getAll({ page, limit });
  }

  async getById(id) {
    const pago = await this.pagoCompraDAO.getById(id);
    if (!pago) throw bizError('Pago de compra no encontrado', 404);
    return pago;
  }

  // "Registrar pago posterior": paga (total o parcialmente) el saldo pendiente de una
  // Compra ya existente, sin recrearla. Transaccional: PagoCompra + Haber en
  // CuentaCorrienteProveedor + actualización de SaldoPendiente/EstadoPago de la Compra
  // quedan todos adentro o todos afuera.
  async create(data, ctx = null) {
    const sequelize = this.pagoCompraDAO.model.sequelize;
    const t = await sequelize.transaction();

    try {
      const { Compra, MetodoPago, TurnoCaja } = sequelize.models;

      const compra = await Compra.findByPk(data.IdCompra, { transaction: t, lock: t.LOCK.UPDATE });
      if (!compra) throw bizError(`Compra no encontrada (Id=${data.IdCompra}).`, 404);

      const metodo = await MetodoPago.findByPk(data.IdMetodoPago, { transaction: t });
      if (!metodo) throw bizError(`Método de pago no encontrado (Id=${data.IdMetodoPago}).`, 404);

      const turno = await TurnoCaja.findByPk(data.IdTurnoCaja, { transaction: t });
      if (!turno) throw bizError(`Turno de caja no encontrado (Id=${data.IdTurnoCaja}).`, 404);

      const monto = round2(data.Monto);
      const saldoActual = Number(compra.SaldoPendiente);
      if (monto > saldoActual) {
        throw bizError(`El pago (${monto}) supera el saldo pendiente de la Compra Id=${data.IdCompra} (${saldoActual}).`);
      }

      const pago = await this.pagoCompraDAO.create({
        Monto: monto,
        FechaPago: data.FechaPago ? new Date(data.FechaPago) : new Date(),
        IdCompra: data.IdCompra,
        IdMetodoPago: data.IdMetodoPago,
        IdTurnoCaja: data.IdTurnoCaja
      }, { transaction: t });

      await this.cuentaCorrienteProveedorService.registrarPago(
        { IdProveedor: compra.IdProveedor, IdCompra: compra.Id, IdPagoCompra: pago.Id, Monto: monto },
        { transaction: t }
      );

      const nuevoSaldo = round2(saldoActual - monto);
      const nuevoEstado = nuevoSaldo === 0 ? 3 : 2;
      await compra.update({ SaldoPendiente: nuevoSaldo, EstadoPago: nuevoEstado }, { transaction: t });

      await t.commit();

      await auditar(this.bitacoraService, ctx,
        `Registró un pago de ${monto} a la compra #${data.IdCompra} (pago #${pago.Id})`,
        `Saldo pendiente: ${nuevoSaldo} · estado ${nuevoEstado === 3 ? 'Pagado' : 'Parcial'}`);

      return await this.pagoCompraDAO.getById(pago.Id);
    } catch (err) {
      await t.rollback();
      if (err.statusCode) throw err;
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al registrar el pago';
      throw new Error(message);
    }
  }
}

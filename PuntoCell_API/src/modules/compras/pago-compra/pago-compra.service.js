const round2 = (value) => Number(Number(value || 0).toFixed(2));

export default class PagoCompraService {
  constructor(pagoCompraDAO, cuentaCorrienteProveedorService) {
    this.pagoCompraDAO = pagoCompraDAO;
    this.cuentaCorrienteProveedorService = cuentaCorrienteProveedorService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoCompraDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const pago = await this.pagoCompraDAO.getById(id);
    if (!pago) throw new Error('Pago de compra no encontrado');
    return pago;
  }

  // "RegistrarPagoPosterior": paga (total o parcialmente) el saldo pendiente de una
  // Compra ya existente, sin tocarla ni recrearla. Transaccional: PagoCompra + Haber
  // en CuentaCorrienteProveedor + actualización de SaldoPendiente/EstadoPago de la
  // Compra quedan todos adentro o todos afuera.
  async create(data) {
    const sequelize = this.pagoCompraDAO.model.sequelize;
    const t = await sequelize.transaction();

    try {
      const { Compra, MetodoPago, TurnoCaja } = sequelize.models;

      const compra = await Compra.findByPk(data.IdCompra, { transaction: t, lock: t.LOCK.UPDATE });
      if (!compra) throw new Error(`Compra no encontrada (Id=${data.IdCompra}).`);

      const metodo = await MetodoPago.findByPk(data.IdMetodoPago, { transaction: t });
      if (!metodo) throw new Error(`Método de pago no encontrado (Id=${data.IdMetodoPago}).`);

      const turno = await TurnoCaja.findByPk(data.IdTurnoCaja, { transaction: t });
      if (!turno) throw new Error(`Turno de caja no encontrado (Id=${data.IdTurnoCaja}).`);

      const monto = round2(data.Monto);
      const saldoActual = Number(compra.SaldoPendiente);
      if (monto > saldoActual) {
        throw new Error(`El pago (${monto}) supera el saldo pendiente de la Compra Id=${data.IdCompra} (${saldoActual}).`);
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
        t
      );

      const nuevoSaldo = round2(saldoActual - monto);
      const nuevoEstado = nuevoSaldo === 0 ? 3 : 2;
      await compra.update({ SaldoPendiente: nuevoSaldo, EstadoPago: nuevoEstado }, { transaction: t });

      await t.commit();
      return await this.pagoCompraDAO.getById(pago.Id);
    } catch (err) {
      await t.rollback();
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al registrar el pago';
      throw new Error(message);
    }
  }
}

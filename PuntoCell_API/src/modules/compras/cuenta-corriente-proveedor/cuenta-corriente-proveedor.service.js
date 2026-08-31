const round2 = (value) => Number(Number(value || 0).toFixed(2));

// Historial cronológico de deuda por proveedor (Debe = nueva deuda, Haber = pago que la
// cancela). Las escrituras (registrarDeuda/registrarPago) son de uso interno exclusivo
// desde CompraService/PagoCompraService, siempre dentro de la transacción activa de esa
// operación — no hay POST/PUT/DELETE expuestos para esta entidad.
export default class CuentaCorrienteProveedorService {
  constructor(cuentaCorrienteProveedorDAO) {
    this.cuentaCorrienteProveedorDAO = cuentaCorrienteProveedorDAO;
  }

  async getAll(query = {}) {
    const { page, limit, IdProveedor } = query;
    const where = {};
    if (IdProveedor) where.IdProveedor = Number(IdProveedor);

    return await this.cuentaCorrienteProveedorDAO.getAll({
      page,
      limit,
      where,
      order: [['Id', 'ASC']]
    });
  }

  async getById(id) {
    const movimiento = await this.cuentaCorrienteProveedorDAO.getById(id);
    if (!movimiento) throw new Error('Movimiento de cuenta corriente no encontrado');
    return movimiento;
  }

  // Saldo global de un proveedor: el SaldoAcumulado del último movimiento registrado
  // (0 si todavía no tiene ninguno).
  async getSaldoPorProveedor(idProveedor) {
    const ultimo = await this.cuentaCorrienteProveedorDAO.model.findOne({
      where: { IdProveedor: idProveedor },
      order: [['Id', 'DESC']]
    });
    return { IdProveedor: Number(idProveedor), Saldo: ultimo ? Number(ultimo.SaldoAcumulado) : 0 };
  }

  // Calcula SaldoAcumulado = últimoSaldoDelProveedor + Debe - Haber dentro de la misma
  // transacción del caller. Limitación conocida: no hay lock explícito sobre "el último
  // movimiento del proveedor", así que dos operaciones concurrentes al mismo proveedor
  // podrían pisarse el cálculo — mismo nivel de rigor que ya tiene el resto del proyecto.
  async _registrarMovimiento({ IdProveedor, Concepto, Debe = 0, Haber = 0, IdCompra = null, IdPagoCompra = null }, transaction) {
    const ultimo = await this.cuentaCorrienteProveedorDAO.model.findOne({
      where: { IdProveedor },
      order: [['Id', 'DESC']],
      transaction
    });
    const saldoAnterior = ultimo ? Number(ultimo.SaldoAcumulado) : 0;
    const saldoAcumulado = round2(saldoAnterior + Number(Debe) - Number(Haber));

    return await this.cuentaCorrienteProveedorDAO.create({
      IdProveedor,
      Concepto,
      Debe: round2(Debe),
      Haber: round2(Haber),
      SaldoAcumulado: saldoAcumulado,
      IdCompra,
      IdPagoCompra
    }, { transaction });
  }

  async registrarDeuda({ IdProveedor, IdCompra, Monto }, transaction) {
    return await this._registrarMovimiento(
      { IdProveedor, Concepto: 'Factura de Compra', Debe: Monto, Haber: 0, IdCompra },
      transaction
    );
  }

  async registrarPago({ IdProveedor, IdCompra, IdPagoCompra, Monto }, transaction) {
    return await this._registrarMovimiento(
      { IdProveedor, Concepto: 'Pago a cuenta/total', Debe: 0, Haber: Monto, IdCompra, IdPagoCompra },
      transaction
    );
  }
}

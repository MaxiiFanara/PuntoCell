import { Op } from 'sequelize';
import { normalizeRange, periodKey, plainList, resolveIdSucursal, toNumber } from '../dashboard/dashboard.utils.js';

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const bizError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export default class CajaService {
  constructor(models) {
    this.models = models;
  }

  _getModels() {
    const { MovimientoCaja, TurnoCaja, Usuario, Sucursal } = this.models || {};
    if (!MovimientoCaja || !TurnoCaja) {
      throw bizError('El módulo de caja no está inicializado correctamente.', 500);
    }
    return { MovimientoCaja, TurnoCaja, Usuario, Sucursal };
  }

  _parseTurnoId(query = {}) {
    const raw = query.IdTurnoCaja ?? query.idTurnoCaja ?? query.turnoCajaId ?? query.turnoId;
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  _buildIncludes(idSucursal = null) {
    const { TurnoCaja, Usuario, Sucursal } = this._getModels();
    return [
      {
        model: TurnoCaja,
        as: 'turnoCaja',
        attributes: ['Id', 'IdSucursal', 'FechaApertura', 'FechaCierre', 'MontoInicial', 'TotalIngresos', 'TotalEgresos'],
        required: idSucursal !== null,
        ...(idSucursal !== null ? { where: { IdSucursal: idSucursal } } : {}),
        include: [
          {
            model: Sucursal,
            as: 'sucursal',
            attributes: ['Id', 'Nombre'],
            required: false
          }
        ]
      },
      {
        model: Usuario,
        as: 'empleado',
        attributes: ['Id', 'Nombre', 'Apellido'],
        required: false
      }
    ];
  }

  async registrarMovimiento({
    IdTurnoCaja,
    IdEmpleado,
    Monto,
    TipoMovimiento,
    Descripcion,
    Fecha
  }, options = {}) {
    const transaction = options.transaction || null;
    const monto = round2(Monto);

    if (!IdTurnoCaja) throw bizError('IdTurnoCaja es requerido para registrar un movimiento de caja.');
    if (!IdEmpleado) throw bizError('IdEmpleado es requerido para registrar un movimiento de caja.');
    if (!(monto > 0)) throw bizError('El monto del movimiento de caja debe ser mayor a 0.');
    if (!Descripcion) throw bizError('La descripción del movimiento de caja es requerida.');

    const { MovimientoCaja, TurnoCaja } = this._getModels();
    const turno = await TurnoCaja.findByPk(IdTurnoCaja, {
      transaction,
      lock: transaction?.LOCK?.UPDATE
    });
    if (!turno) throw bizError(`Turno de caja no encontrado (Id=${IdTurnoCaja}).`, 404);

    const movimiento = await MovimientoCaja.create({
      Fecha: Fecha ? new Date(Fecha) : new Date(),
      Monto: monto,
      TipoMovimiento: !!TipoMovimiento,
      Descripcion,
      IdTurnoCaja,
      IdEmpleado
    }, { transaction });

    const campoTotal = TipoMovimiento ? 'TotalIngresos' : 'TotalEgresos';
    const totalActual = round2(turno[campoTotal]);
    await turno.update({ [campoTotal]: round2(totalActual + monto) }, { transaction });

    return movimiento;
  }

  async registrarIngreso(data, options = {}) {
    return await this.registrarMovimiento({ ...data, TipoMovimiento: true }, options);
  }

  async registrarEgreso(data, options = {}) {
    return await this.registrarMovimiento({ ...data, TipoMovimiento: false }, options);
  }

  async getMovimientos(query = {}, ctx = null) {
    const { MovimientoCaja } = this._getModels();
    const { from, to } = normalizeRange({ from: query.desde ?? query.from, to: query.hasta ?? query.to }, 30);
    const idSucursal = resolveIdSucursal(query);
    const idTurnoCaja = this._parseTurnoId(query);
    const tipo = String(query.tipo ?? '').toLowerCase();
    const where = { Fecha: { [Op.between]: [from, to] } };

    if (idTurnoCaja) where.IdTurnoCaja = idTurnoCaja;
    if (tipo === 'ingreso') where.TipoMovimiento = true;
    if (tipo === 'egreso') where.TipoMovimiento = false;

    const page = Number(query.page) || 0;
    const limit = Number(query.limit) || 50;
    const options = {
      where,
      include: this._buildIncludes(idSucursal),
      order: [['Fecha', 'DESC'], ['Id', 'DESC']],
      distinct: true
    };

    if (page > 0) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }

    const result = await MovimientoCaja.findAndCountAll(options);
    const rows = plainList(result.rows);
    const payload = {
      period: { from: from.toISOString(), to: to.toISOString() },
      filters: { idSucursal, idTurnoCaja, tipo: tipo || null },
      rows,
      total: result.count
    };

    if (page > 0) {
      payload.page = page;
      payload.limit = limit;
    }

    return payload;
  }

  async getResumen(query = {}, ctx = null) {
    const { MovimientoCaja, TurnoCaja } = this._getModels();
    const { from, to } = normalizeRange({ from: query.desde ?? query.from, to: query.hasta ?? query.to }, 30);
    const idSucursal = resolveIdSucursal(query);
    const idTurnoCaja = this._parseTurnoId(query);
    const groupBy = String(query.groupBy ?? 'day').toLowerCase();
    const tipo = String(query.tipo ?? '').toLowerCase();

    const where = { Fecha: { [Op.between]: [from, to] } };
    if (idTurnoCaja) where.IdTurnoCaja = idTurnoCaja;
    if (tipo === 'ingreso') where.TipoMovimiento = true;
    if (tipo === 'egreso') where.TipoMovimiento = false;

    const movimientos = plainList(await MovimientoCaja.findAll({
      where,
      include: this._buildIncludes(idSucursal),
      order: [['Fecha', 'ASC'], ['Id', 'ASC']]
    }));

    const map = new Map();
    for (const movimiento of movimientos) {
      const key = groupBy === 'turno'
        ? `turno-${movimiento.IdTurnoCaja}`
        : periodKey(movimiento.Fecha, groupBy);
      if (!map.has(key)) {
        map.set(key, {
          period: key,
          ingresos: 0,
          egresos: 0,
          movimientos: 0,
          totalNeto: 0
        });
      }
      const bucket = map.get(key);
      const monto = toNumber(movimiento.Monto);
      bucket.movimientos += 1;
      if (Number(movimiento.TipoMovimiento) === 1) bucket.ingresos += monto;
      else bucket.egresos += monto;
      bucket.totalNeto = bucket.ingresos - bucket.egresos;
    }

    const series = Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const totals = movimientos.reduce((acc, movimiento) => {
      const monto = toNumber(movimiento.Monto);
      if (Number(movimiento.TipoMovimiento) === 1) acc.ingresos += monto;
      else acc.egresos += monto;
      acc.movimientos += 1;
      return acc;
    }, { ingresos: 0, egresos: 0, movimientos: 0 });
    totals.ingresos = round2(totals.ingresos);
    totals.egresos = round2(totals.egresos);
    totals.totalNeto = round2(totals.ingresos - totals.egresos);

    let turnoCaja = null;
    if (idTurnoCaja) {
      turnoCaja = plainList([await TurnoCaja.findByPk(idTurnoCaja, {
        include: [
          { model: this.models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }
        ]
      })])[0] ?? null;
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString(), groupBy },
      filters: { idSucursal, idTurnoCaja, tipo: tipo || null },
      totals,
      series,
      turnoCaja
    };
  }
}
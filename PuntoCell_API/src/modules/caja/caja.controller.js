const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class CajaController {
  constructor(service) {
    this.service = service;
  }

  getMovimientos = async (req, res, next) => {
    try {
      const data = await this.service.getMovimientos(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getResumen = async (req, res, next) => {
    try {
      const data = await this.service.getResumen(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getMovimientosPorTurno = async (req, res, next) => {
    try {
      const data = await this.service.getMovimientos({ ...req.query, IdTurnoCaja: req.params.idTurnoCaja }, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getResumenPorTurno = async (req, res, next) => {
    try {
      const data = await this.service.getResumen({ ...req.query, IdTurnoCaja: req.params.idTurnoCaja }, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getTurnoActual = async (req, res, next) => {
    try {
      const data = await this.service.getTurnoActual(ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  abrirTurno = async (req, res, next) => {
    try {
      const data = await this.service.abrirTurno(req.body, ctxFromReq(req));
      return res.status(201).json({ status: 'success', data, message: 'Turno abierto correctamente' });
    } catch (err) {
      next(err);
    }
  };

  cerrarTurno = async (req, res, next) => {
    try {
      const data = await this.service.cerrarTurno(req.body, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data, message: 'Turno cerrado correctamente' });
    } catch (err) {
      next(err);
    }
  };

  registrarMovimientoManual = async (req, res, next) => {
    try {
      const ctx = ctxFromReq(req);
      
      // Buscar el turno abierto para asignarle el movimiento
      const turno = await this.service.getTurnoActual(ctx);
      if (!turno) return res.status(400).json({ status: 'error', message: 'No hay caja abierta.' });

      const payload = {
        ...req.body,
        IdTurnoCaja: turno.Id,
        IdEmpleado: ctx.IdEmpleado
      };

      const data = await this.service.registrarMovimiento(payload);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}
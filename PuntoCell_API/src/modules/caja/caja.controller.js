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
}
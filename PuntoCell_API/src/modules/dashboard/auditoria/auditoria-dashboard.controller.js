const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class AuditoriaDashboardController {
  constructor(service){ this.service = service; }

  empleadoOperacion = async (req, res, next) => { try { const data = await this.service.getMatrizEmpleadoOperacion(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }
}

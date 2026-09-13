const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class ReparacionesDashboardController {
  constructor(service){ this.service = service; }

  reparacionesPorPeriodo = async (req, res, next) => { try { const data = await this.service.getReparacionesEvolucion(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  reparacionesPorTipo = async (req, res, next) => { try { const data = await this.service.getReparacionesPorTipo(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  reparacionesPorMarca = async (req, res, next) => { try { const data = await this.service.getReparacionesPorMarca(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  repuestosUsados = async (req, res, next) => { try { const data = await this.service.getRepuestosUsados(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  heatmapMarcaFalla = async (req, res, next) => { try { const data = await this.service.getHeatmapMarcaFalla(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  paretoFallas = async (req, res, next) => { try { const data = await this.service.getParetoFallas(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  tiemposReparacion = async (req, res, next) => { try { const data = await this.service.getTiemposReparacion(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

  rentabilidadPorFalla = async (req, res, next) => { try { const data = await this.service.getRentabilidadPorFalla(req.query, ctxFromReq(req)); return res.status(200).json({ status:'success', data }); } catch(err){ next(err); } }

}

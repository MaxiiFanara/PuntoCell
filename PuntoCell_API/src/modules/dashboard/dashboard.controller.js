const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class DashboardController {
  constructor(service) { this.service = service; }

  resumen = async (req, res, next) => {
    try {
      const data = await this.service.getSummary(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  evolucionVentas = async (req, res, next) => {
    try {
      const data = await this.service.getSalesEvolution(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  ventasPorCategoria = async (req, res, next) => {
    try {
      const data = await this.service.getSalesByCategory(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  paretoProductos = async (req, res, next) => {
    try {
      const data = await this.service.getParetoProducts(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  dispersionPrecioCantidad = async (req, res, next) => {
    try {
      const data = await this.service.getPriceQuantityScatter(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  elasticidadPrecioDemanda = async (req, res, next) => {
    try {
      const data = await this.service.getPriceElasticity(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  ventasPorFormaPago = async (req, res, next) => {
    try {
      const data = await this.service.getSalesByPaymentMethod(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  ventasPorSucursal = async (req, res, next) => {
    try {
      const data = await this.service.getSalesByBranch(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  proyeccionDemanda = async (req, res, next) => {
    try {
      const data = await this.service.getDemandProjection(req.query, ctxFromReq(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }
}

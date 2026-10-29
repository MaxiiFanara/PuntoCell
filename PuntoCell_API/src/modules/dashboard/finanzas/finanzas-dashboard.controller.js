const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class FinanzasDashboardController {
  constructor(service){ this.service = service; }

  ingresosEgresos = async (req, res, next) => { try { const data = await this.service.getIngresosEgresos(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  margenBruto = async (req, res, next) => { try { const data = await this.service.getMargenBruto(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  margenPorProducto = async (req, res, next) => { try { const data = await this.service.getMargenPorProducto(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  margenPorCategoria = async (req, res, next) => { try { const data = await this.service.getMargenPorCategoria(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  rentabilidadPorMarca = async (req, res, next) => { try { const data = await this.service.getRentabilidadPorMarca(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }
}

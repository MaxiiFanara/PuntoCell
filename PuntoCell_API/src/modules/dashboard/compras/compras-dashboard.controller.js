import { comprasDateRangeSchema } from './compras-dashboard.dto.js';

const ctxFromReq = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class ComprasDashboardController {
  constructor(service) { this.service = service; }

  evolucionCostoCompras = async (req, res, next) => { try { const data = await this.service.getCostoEvolucion(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  comprasPorProveedor = async (req, res, next) => { try { const data = await this.service.getComprasPorProveedor(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  rankingProveedores = async (req, res, next) => { try { const data = await this.service.getRankingProveedores(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  evolucionPrecioProducto = async (req, res, next) => { try { const data = await this.service.getEvolucionPrecioProducto(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  variacionPrecioProveedor = async (req, res, next) => { try { const data = await this.service.getVariacionPrecioProveedor(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  abcCompras = async (req, res, next) => { try { const data = await this.service.getABCCompras(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  puntoReposicion = async (req, res, next) => { try { const data = await this.service.getPuntoReposicion(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  stockSeguridad = async (req, res, next) => { try { const data = await this.service.getStockSeguridad(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }

  eoq = async (req, res, next) => { try { const data = await this.service.getEOQ(req.query, ctxFromReq(req)); return res.status(200).json({ status: 'success', data }); } catch (err) { next(err); } }
}

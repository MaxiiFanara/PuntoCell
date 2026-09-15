export default class ReportesController {
  constructor(service) {
    this.service = service
  }

  compras = async (req, res, next) => {
    try {
      const data = await this.service.getComprasReport(req.query)
      return res.status(200).json({ status: 'success', data })
    } catch (err) {
      next(err)
    }
  }

  ventas = async (req, res, next) => {
    try {
      const data = await this.service.getVentasReport(req.query)
      return res.status(200).json({ status: 'success', data })
    } catch (err) {
      next(err)
    }
  }

  inventario = async (req, res, next) => {
    try {
      const data = await this.service.getInventarioReport(req.query)
      return res.status(200).json({ status: 'success', data })
    } catch (err) {
      next(err)
    }
  }

  reparaciones = async (req, res, next) => {
    try {
      const data = await this.service.getReparacionesReport(req.query)
      return res.status(200).json({ status: 'success', data })
    } catch (err) {
      next(err)
    }
  }
}
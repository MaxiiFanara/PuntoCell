import ReportesService from './reportes.service.js'
import ReportesController from './reportes.controller.js'

export function createReportesModule(bitacoraService = null) {
  const service = new ReportesService(bitacoraService)
  const reportesController = new ReportesController(service)

  return { reportesController }
}
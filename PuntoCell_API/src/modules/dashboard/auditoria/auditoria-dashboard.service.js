import { Op } from 'sequelize'
import { auditar } from '../../../core/utils/audit.util.js'
import { models } from '../../../models/index.js'
import { normalizeRange, plainList, resolveIdSucursal } from '../dashboard.utils.js'

export default class AuditoriaDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService }

  _resolveRange(query = {}, defaultMonths = 1) {
    return normalizeRange(query, defaultMonths * 30)
  }

  async getMatrizEmpleadoOperacion(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 1)
    const idSucursal = resolveIdSucursal(query)
    const rows = plainList(await models.Bitacora.findAll({
      where: { Origen: 'AUDITORIA', Fecha: { [Op.between]: [from, to] }, ...(idSucursal === null ? {} : { IdSucursal: idSucursal }) },
      include: [{ model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false }],
      order: [['Fecha', 'ASC']],
      limit: 5000
    }))
    const empleados = new Map()
    const acciones = new Set()
    for (const bitacora of rows) {
      const accion = bitacora.Accion ?? 'Sin acción'
      acciones.add(accion)
      const id = String(bitacora.IdEmpleado ?? 'null')
      if (!empleados.has(id)) {
        const nombre = [bitacora.empleado?.Nombre, bitacora.empleado?.Apellido].filter(Boolean).join(' ') || 'Sistema'
        empleados.set(id, { id: bitacora.IdEmpleado, empleado: nombre, counts: {} })
      }
      const bucket = empleados.get(id)
      bucket.counts[accion] = (bucket.counts[accion] || 0) + 1
    }
    const accionesArr = Array.from(acciones)
    const matrix = Array.from(empleados.values()).map((empleado) => ({ id: empleado.id, empleado: empleado.empleado, counts: accionesArr.map((accion) => empleado.counts[accion] || 0) }))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó matriz empleado×operación', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, acciones: accionesArr, matrix }
  }
}

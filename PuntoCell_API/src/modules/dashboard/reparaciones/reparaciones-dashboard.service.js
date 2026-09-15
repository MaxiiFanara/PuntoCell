import { Op } from 'sequelize'
import { auditar } from '../../../core/utils/audit.util.js'
import { models } from '../../../models/index.js'
import { normalizeRange, periodKey, plainList, sortDesc, toNumber } from '../dashboard.utils.js'

const VALID_GRAN = ['day', 'week', 'month', 'year']
const rangeToWhere = (field, from, to) => ({ [field]: { [Op.between]: [from, to] } })

const buildRepairIncludes = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.DispositivoCliente, as: 'dispositivo', attributes: ['Id', 'IdModeloArticulo', 'IdCliente'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] },
  { model: models.Falla, as: 'fallas', through: { attributes: [] }, attributes: ['Id', 'Nombre'], required: false },
  { model: models.RepuestoOrden, as: 'repuestos', attributes: ['Id', 'Cantidad', 'IdInventario'], required: false, include: [{ model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'Stock'], required: false, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre'], required: false }] }] },
])

export default class ReparacionesDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService }

  _resolveRange(query = {}, defaultDays = 29) { return normalizeRange(query, defaultDays) }

  async getReparacionesEvolucion(query = {}, ctx = null) {
    const gran = VALID_GRAN.includes(String(query.granularity || '').toLowerCase()) ? String(query.granularity).toLowerCase() : 'day'
    const { from, to } = this._resolveRange(query, 29)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), attributes: ['Id', 'FechaEmision'], order: [['FechaEmision', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const reparacion of rows) {
      const key = periodKey(reparacion.FechaEmision, gran)
      if (!map.has(key)) map.set(key, { period: key, repairs: 0 })
      map.get(key).repairs += 1
    }
    const series = Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por período', `gran=${gran}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series }
  }

  async getReparacionesPorTipo(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 29)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), include: buildRepairIncludes(), order: [['FechaEmision', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const reparacion of rows) {
      const categoria = reparacion.dispositivo?.modelo?.categoria?.Nombre ?? 'Categoría'
      if (!map.has(categoria)) map.set(categoria, { IdCategoria: reparacion.dispositivo?.modelo?.IdCategoriaArticulo ?? reparacion.dispositivo?.modelo?.IdCategoriaProducto ?? null, categoria, repairs: 0 })
      map.get(categoria).repairs += 1
    }
    const categories = Array.from(map.values()).sort((a, b) => b.repairs - a.repairs)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por tipo', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, categories }
  }

  async getReparacionesPorMarca(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 29)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), include: buildRepairIncludes(), order: [['FechaEmision', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const reparacion of rows) {
      const marca = reparacion.dispositivo?.modelo?.marca?.Nombre ?? 'Marca'
      if (!map.has(marca)) map.set(marca, { IdMarca: reparacion.dispositivo?.modelo?.IdMarcaArticulo ?? reparacion.dispositivo?.modelo?.IdMarcaProducto ?? null, marca, repairs: 0 })
      map.get(marca).repairs += 1
    }
    const marcas = Array.from(map.values()).sort((a, b) => b.repairs - a.repairs)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por marca', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, marcas }
  }

  async getRepuestosUsados(query = {}, ctx = null) {
    const limit = Math.max(1, Math.min(Number(query.limit) || 5, 50))
    const { from, to } = this._resolveRange(query, 29)
    const rows = plainList(await models.RepuestoOrden.findAll({ where: { [Op.and]: [{}, { }] }, include: [{ model: models.OrdenReparacion, as: 'orden', attributes: ['Id', 'FechaEmision'], required: true }, { model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo'], required: true, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre'], required: false }] }], order: [['Id', 'ASC']], limit: 5000 }))
    const map = new Map()
    for (const repuesto of rows) {
      const fecha = repuesto.orden?.FechaEmision
      if (!fecha) continue
      const repairDate = new Date(fecha)
      if (repairDate < from || repairDate > to) continue
      const id = repuesto.inventario?.IdArticulo ?? repuesto.IdInventario
      const name = repuesto.inventario?.articulo?.Nombre ?? `Repuesto ${id}`
      if (!map.has(id)) map.set(id, { IdArticulo: id, Repuesto: name, CantidadUsada: 0 })
      map.get(id).CantidadUsada += toNumber(repuesto.Cantidad)
    }
    const entries = sortDesc(Array.from(map.values()).map((item) => ({ ...item, totalCount: item.CantidadUsada, totalAmount: item.CantidadUsada })), limit).map(({ totalCount, totalAmount, ...rest }) => ({ ...rest, CantidadUsada: Number(rest.CantidadUsada || 0) }))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó repuestos más usados', `limit=${limit}`)
    return { entries }
  }

  async getHeatmapMarcaFalla(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 89)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), include: buildRepairIncludes(), order: [['FechaEmision', 'ASC']], limit: 1000 }))
    const map = new Map()
    const fallasSet = new Set()
    const marcasSet = new Set()
    for (const reparacion of rows) {
      const marca = reparacion.dispositivo?.modelo?.marca?.Nombre ?? 'Marca'
      marcasSet.add(marca)
      for (const falla of reparacion.fallas ?? []) {
        const nombreFalla = falla.Nombre ?? 'Falla'
        fallasSet.add(nombreFalla)
        if (!map.has(marca)) map.set(marca, {})
        map.get(marca)[nombreFalla] = (map.get(marca)[nombreFalla] || 0) + 1
      }
    }
    const marcas = Array.from(marcasSet)
    const fallas = Array.from(fallasSet)
    const matrix = marcas.map((marca) => ({ marca, counts: fallas.map((falla) => map.get(marca)?.[falla] || 0) }))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó heatmap marca×falla', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, marcas, fallas, matrix }
  }

  async getParetoFallas(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 89)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), include: buildRepairIncludes(), order: [['FechaEmision', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const reparacion of rows) {
      for (const falla of reparacion.fallas ?? []) {
        const id = falla.Id
        if (!map.has(id)) map.set(id, { id, falla: falla.Nombre ?? `Falla ${id}`, count: 0 })
        map.get(id).count += 1
      }
    }
    const ranked = Array.from(map.values()).sort((a, b) => b.count - a.count)
    const total = ranked.reduce((s, r) => s + r.count, 0)
    let cumulative = 0
    const entries = ranked.map((row, index) => {
      const pct = total > 0 ? (row.count / total) * 100 : 0
      cumulative += pct
      return { rank: index + 1, id: row.id, falla: row.falla, count: row.count, percentage: Number(pct.toFixed(2)), cumulative: Number(cumulative.toFixed(2)) }
    })
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó pareto de fallas', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, total, entries }
  }

  async getTiemposReparacion(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 90)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: { FechaEntrega: { [Op.ne]: null }, FechaEmision: { [Op.between]: [from, to] } }, attributes: ['Id', 'FechaEmision', 'FechaEntrega'], order: [['FechaEmision', 'ASC']], limit: 5000 }))
    const diffs = rows.map((row) => Math.max(0, Math.floor((new Date(row.FechaEntrega) - new Date(row.FechaEmision)) / 86400000)))
    const mean = diffs.reduce((s, x) => s + x, 0) / Math.max(1, diffs.length)
    const buckets = [
      { range: '0-0', count: 0 },
      { range: '1-2', count: 0 },
      { range: '3-6', count: 0 },
      { range: '7-13', count: 0 },
      { range: '14-29', count: 0 },
      { range: '30-89', count: 0 },
      { range: '90+', count: 0 },
    ]
    for (const diff of diffs) {
      if (diff < 1) buckets[0].count += 1
      else if (diff < 3) buckets[1].count += 1
      else if (diff < 7) buckets[2].count += 1
      else if (diff < 14) buckets[3].count += 1
      else if (diff < 30) buckets[4].count += 1
      else if (diff < 90) buckets[5].count += 1
      else buckets[6].count += 1
    }
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó tiempos de reparación', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, mean: Number(mean.toFixed(2)), count: diffs.length, histogram: buckets }
  }

  async getRentabilidadPorFalla(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 180)
    const rows = plainList(await models.OrdenReparacion.findAll({ where: rangeToWhere('FechaEmision', from, to), include: buildRepairIncludes(), order: [['FechaEmision', 'ASC']], limit: 5000 }))
    const map = new Map()
    for (const reparacion of rows) {
      for (const falla of reparacion.fallas ?? []) {
        const id = falla.Id
        if (!map.has(id)) map.set(id, { id, falla: falla.Nombre ?? `Falla ${id}`, repairs: 0, revenue: 0, cost: 0 })
        const bucket = map.get(id)
        bucket.repairs += 1
        bucket.revenue += toNumber(reparacion.TotalReparacion)
        bucket.cost += toNumber(reparacion.CostoRepuestos) + toNumber(reparacion.PrecioManoObra)
      }
    }
    const entries = Array.from(map.values()).map((row) => {
      const margin = row.revenue - row.cost
      const marginPct = row.revenue > 0 ? Number(((margin / row.revenue) * 100).toFixed(2)) : 0
      return { id: row.id, falla: row.falla, repairs: row.repairs, revenue: Number(row.revenue.toFixed(2)), cost: Number(row.cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }
    }).sort((a, b) => b.repairs - a.repairs)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó rentabilidad por falla', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries }
  }
}

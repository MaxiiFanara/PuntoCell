import { Op } from 'sequelize'
import { auditar } from '../../../core/utils/audit.util.js'
import { models } from '../../../models/index.js'
import { includesForProducto, normalizeRange, periodKey, plainList, resolveIdSucursal, resolveProductId, toNumber } from '../dashboard.utils.js'

const rangeToWhere = (field, from, to) => ({ [field]: { [Op.between]: [from, to] } })

const buildVentaIncludes = (idSucursal = null) => ([
  { model: models.TurnoCaja, as: 'turnoCaja', attributes: ['Id', 'IdSucursal'], required: idSucursal !== null, ...(idSucursal !== null ? { where: { IdSucursal: idSucursal } } : {}), include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.DetalleVenta, as: 'detalles', attributes: ['Id', 'Cantidad', 'PrecioUnitario', 'IdArticulo'], required: false, include: [{ model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], required: false, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] }] }] },
  { model: models.PagoVenta, as: 'pagos', attributes: ['Id', 'Monto', 'IdMetodoPago', 'FechaPago'], required: false, include: [{ model: models.MetodoPago, as: 'metodoPago', attributes: ['Id', 'Nombre'], required: false }] },
])

const buildMovimientoIncludes = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
])

const buildMovimientoCajaIncludes = (idSucursal = null) => ([
  { model: models.TurnoCaja, as: 'turnoCaja', attributes: ['Id', 'IdSucursal'], required: idSucursal !== null, ...(idSucursal !== null ? { where: { IdSucursal: idSucursal } } : {}), include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
])

const getDetalleProductId = (detalle) => detalle?.inventario?.IdProducto ?? detalle?.inventario?.IdArticulo ?? detalle?.IdArticulo ?? null

const hasProductInSale = (venta, productId) => {
  if (productId === null) return true
  return (venta.detalles ?? []).some((detalle) => Number(getDetalleProductId(detalle)) === Number(productId))
}

const filterSalesByProduct = (rows, productId) => (productId === null ? rows : rows.filter((row) => hasProductInSale(row, productId)))

export default class FinanzasDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService }

  _resolveRange(query = {}, defaultMonths = 2) {
    return normalizeRange(query, defaultMonths * 30)
  }

  async getIngresosEgresos(query = {}, ctx = null) {
    const gran = query.granularity || 'month'
    const { from, to } = this._resolveRange(query, 5)
    const idSucursal = resolveIdSucursal(query)
    const rows = plainList(await models.MovimientoCaja.findAll({ where: rangeToWhere('Fecha', from, to), attributes: ['Id', 'Fecha', 'TipoMovimiento', 'Monto'], include: buildMovimientoCajaIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const movimiento of rows) {
      const key = gran === 'month' ? String(movimiento.Fecha).slice(0, 7) : String(movimiento.Fecha).slice(0, 10)
      if (!map.has(key)) map.set(key, { period: key, ingresos: 0, egresos: 0 })
      const bucket = map.get(key)
      if (Number(movimiento.TipoMovimiento) === 1) bucket.ingresos += toNumber(movimiento.Monto)
      else bucket.egresos += toNumber(movimiento.Monto)
    }
    const series = Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ingresos vs egresos', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series }
  }

  async getMargenBruto(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 2)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), attributes: ['Id', 'TotalVenta', 'TotalCosto'], include: buildVentaIncludes(idSucursal).slice(0, 1), limit: 1000 })), productId)
    const totalVentas = rows.reduce((sum, row) => sum + toNumber(row.TotalVenta), 0)
    const totalCostos = rows.reduce((sum, row) => sum + toNumber(row.TotalCosto), 0)
    const margen = totalVentas - totalCostos
    const margenPct = totalVentas > 0 ? Number(((margen / totalVentas) * 100).toFixed(2)) : 0
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen bruto', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, totalVentas, totalCostos, margen: Number(margen.toFixed(2)), margenPct }
  }

  async getMargenPorProducto(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 2)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const map = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const meta = detalle.inventario?.articulo?.modelo?.articulo?.Nombre ? null : null
        const productId = detalle.inventario?.IdProducto ?? detalle.inventario?.IdArticulo
        const producto = detalle.inventario?.articulo?.Nombre ?? `Producto ${productId}`
        if (!map.has(productId)) map.set(productId, { id: productId, producto, revenue: 0, cost: 0 })
        const bucket = map.get(productId)
        const qty = toNumber(detalle.Cantidad)
        bucket.revenue += qty * toNumber(detalle.PrecioUnitario)
        bucket.cost += qty * toNumber(detalle.inventario?.precios?.[0]?.CostoReal ?? detalle.inventario?.precios?.[0]?.CostoBase ?? 0)
      }
    }
    const entries = Array.from(map.values()).map((row) => {
      const margin = row.revenue - row.cost
      const marginPct = row.revenue > 0 ? Number(((margin / row.revenue) * 100).toFixed(2)) : 0
      return { id: row.id, producto: row.producto, revenue: Number(row.revenue.toFixed(2)), cost: Number(row.cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }
    }).sort((a, b) => b.revenue - a.revenue)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen por producto', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries }
  }

  async getMargenPorCategoria(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 2)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const map = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const category = detalle.inventario?.articulo?.modelo?.categoria?.Nombre ?? 'Categoría'
        if (!map.has(category)) map.set(category, { categoria: category, revenue: 0, cost: 0 })
        const bucket = map.get(category)
        const qty = toNumber(detalle.Cantidad)
        bucket.revenue += qty * toNumber(detalle.PrecioUnitario)
        bucket.cost += qty * toNumber(detalle.inventario?.precios?.[0]?.CostoReal ?? detalle.inventario?.precios?.[0]?.CostoBase ?? 0)
      }
    }
    const entries = Array.from(map.values()).map((row) => {
      const margin = row.revenue - row.cost
      const marginPct = row.revenue > 0 ? Number(((margin / row.revenue) * 100).toFixed(2)) : 0
      return { categoria: row.categoria, revenue: Number(row.revenue.toFixed(2)), cost: Number(row.cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }
    }).sort((a, b) => b.revenue - a.revenue)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen por categoría', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries }
  }

  async getRentabilidadPorMarca(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 5)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const map = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const brand = detalle.inventario?.articulo?.modelo?.marca?.Nombre ?? 'Marca'
        if (!map.has(brand)) map.set(brand, { marca: brand, revenue: 0, cost: 0 })
        const bucket = map.get(brand)
        const qty = toNumber(detalle.Cantidad)
        bucket.revenue += qty * toNumber(detalle.PrecioUnitario)
        bucket.cost += qty * toNumber(detalle.inventario?.precios?.[0]?.CostoReal ?? detalle.inventario?.precios?.[0]?.CostoBase ?? 0)
      }
    }
    const entries = Array.from(map.values()).map((row) => {
      const margin = row.revenue - row.cost
      const marginPct = row.revenue > 0 ? Number(((margin / row.revenue) * 100).toFixed(2)) : 0
      return { marca: row.marca, revenue: Number(row.revenue.toFixed(2)), cost: Number(row.cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }
    }).sort((a, b) => b.margin - a.margin)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó rentabilidad por marca', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries }
  }
}

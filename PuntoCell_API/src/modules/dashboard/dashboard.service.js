import { Op } from 'sequelize'
import { auditar } from '../../core/utils/audit.util.js'
import { models } from '../../models/index.js'
import { getProductoMeta, includesForProducto, normalizeRange, periodKey, plainList, resolveIdSucursal, resolveProductId, sortDesc, toNumber } from './dashboard.utils.js'

const VALID_GRAN = ['day', 'week', 'month', 'year']

const rangeToWhere = (field, from, to) => ({ [field]: { [Op.between]: [from, to] } })
const sum = (rows, mapper) => rows.reduce((total, item) => total + toNumber(mapper(item)), 0)

const buildVentaIncludes = (idSucursal = null) => ([
  { model: models.TurnoCaja, as: 'turnoCaja', attributes: ['Id', 'IdSucursal'], required: idSucursal !== null, ...(idSucursal !== null ? { where: { IdSucursal: idSucursal } } : {}), include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.Usuario, as: 'cliente', attributes: ['Id', 'Nombre', 'Apellido', 'DNI'], required: false },
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.PagoVenta, as: 'pagos', attributes: ['Id', 'Monto', 'IdMetodoPago', 'FechaPago'], required: false, include: [{ model: models.MetodoPago, as: 'metodoPago', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.DetalleVenta, as: 'detalles', attributes: ['Id', 'Cantidad', 'PrecioUnitario', 'IdArticulo'], required: false, include: [{ model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], required: false, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] }] }] },
])

const buildCompraIncludes = () => ([
  { model: models.Proveedor, as: 'proveedor', attributes: ['Id', 'Nombre'], required: false },
  { model: models.Sucursal, as: 'sucursalDestino', attributes: ['Id', 'Nombre'], required: false },
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.DetalleCompra, as: 'detalles', attributes: ['Id', 'Cantidad', 'CostoUnitario', 'IdArticulo'], required: false, include: [{ model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], required: false, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] }] }] },
])

const buildRepairIncludes = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido', 'IdSucursal'], required: false, include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.EstadoOrden, as: 'estado', attributes: ['Id', 'Nombre'], required: false },
  { model: models.DispositivoCliente, as: 'dispositivo', attributes: ['Id', 'IdModeloArticulo', 'IdCliente'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] },
  { model: models.Falla, as: 'fallas', through: { attributes: [] }, attributes: ['Id', 'Nombre'], required: false },
])

const getDetalleProductId = (detalle) => detalle?.inventario?.IdProducto ?? detalle?.inventario?.IdArticulo ?? detalle?.IdArticulo ?? null

const hasProductInSale = (venta, productId) => {
  if (productId === null) return true
  return (venta.detalles ?? []).some((detalle) => Number(getDetalleProductId(detalle)) === Number(productId))
}

const filterSalesByProduct = (rows, productId) => (productId === null ? rows : rows.filter((row) => hasProductInSale(row, productId)))

const buildMovimientoIncludes = (idSucursal = null) => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], required: false, include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }, { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] }] },
])

const buildPriceIncludes = () => ([
  { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
  { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] },
  { model: models.PrecioArticulo, as: 'precios', attributes: ['Id', 'CostoReal', 'CostoBase', 'FechaDesde', 'FechaHasta'], required: false },
])

export default class DashboardService {
  constructor(dashboardDAO = null, bitacoraService = null) {
    this.dashboardDAO = dashboardDAO
    this.bitacoraService = bitacoraService
  }

  async getSummary(query = {}, ctx = null) {
    const idSucursal = resolveIdSucursal(query)
    const [ventas, compras, reparaciones, inventario] = await Promise.all([
      models.Venta.count({ include: idSucursal === null ? [] : [{ model: models.TurnoCaja, as: 'turnoCaja', attributes: [], required: true, where: { IdSucursal: idSucursal } }] }),
      models.Compra.count({ where: idSucursal === null ? {} : { IdSucursalDestino: idSucursal } }),
      models.OrdenReparacion.count({ include: idSucursal === null ? [] : [{ model: models.Usuario, as: 'empleado', attributes: [], required: true, where: { IdSucursal: idSucursal } }] }),
      models.Inventario.count({ where: idSucursal === null ? {} : { IdSucursal: idSucursal } }),
    ])

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó resumen de dashboard', 'summary')
    return { ventas: { count: ventas, total: null }, compras: { count: compras, total: null }, reparaciones: { count: reparaciones }, inventario: { count: inventario } }
  }

  async getSalesEvolution(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const gran = VALID_GRAN.includes(String(query.granularity || '').toLowerCase()) ? String(query.granularity).toLowerCase() : 'day'
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), attributes: ['Id', 'Fecha', 'TotalVenta'], include: buildVentaIncludes(idSucursal).slice(0, 1), order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const buckets = new Map()
    for (const venta of rows) {
      const key = periodKey(venta.Fecha, gran)
      if (!buckets.has(key)) buckets.set(key, { period: key, total: 0 })
      buckets.get(key).total += toNumber(venta.TotalVenta)
    }
    const series = Array.from(buckets.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó evolución de ventas', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series }
  }

  async getSalesByCategory(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const categoryMap = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const meta = getProductoMeta(detalle.inventario)
        const category = meta.categoria ?? 'Categoría'
        const amount = toNumber(detalle.Cantidad) * toNumber(detalle.PrecioUnitario)
        if (!categoryMap.has(category)) categoryMap.set(category, { category, total: 0 })
        categoryMap.get(category).total += amount
      }
    }
    const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ventas por categoría', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, categories }
  }

  async getParetoProducts(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const products = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const meta = getProductoMeta(detalle.inventario)
        const amount = toNumber(detalle.Cantidad) * toNumber(detalle.PrecioUnitario)
        const id = meta.id ?? detalle.IdArticulo
        if (!products.has(id)) products.set(id, { id, product: meta.nombre, total: 0 })
        products.get(id).total += amount
      }
    }
    const ranked = Array.from(products.values()).sort((a, b) => b.total - a.total)
    const totalRevenue = sum(ranked, (row) => row.total)
    let cumulative = 0
    const entries = ranked.map((row, index) => {
      const percentage = totalRevenue > 0 ? (row.total / totalRevenue) * 100 : 0
      cumulative += percentage
      return { rank: index + 1, id: row.id, product: row.product, total: row.total, percentage: Number(percentage.toFixed(2)), cumulativePercentage: Number(cumulative.toFixed(2)) }
    })
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó Pareto de productos', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, totalRevenue, entries }
  }

  async getPriceQuantityScatter(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const products = new Map()
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const meta = getProductoMeta(detalle.inventario)
        const id = meta.id ?? detalle.IdArticulo
        if (!products.has(id)) products.set(id, { id, product: meta.nombre, quantity: 0, revenue: 0 })
        products.get(id).quantity += toNumber(detalle.Cantidad)
        products.get(id).revenue += toNumber(detalle.Cantidad) * toNumber(detalle.PrecioUnitario)
      }
    }
    const points = Array.from(products.values()).map((row) => ({ id: row.id, product: row.product, quantity: row.quantity, revenue: Number(row.revenue.toFixed(2)), avgPrice: row.quantity > 0 ? Number((row.revenue / row.quantity).toFixed(2)) : 0 })).sort((a, b) => b.revenue - a.revenue)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó dispersión precio-cantidad', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, points }
  }

  async getPriceElasticity(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const compFrom = new Date(from)
    const compTo = new Date(to)
    compFrom.setMonth(compFrom.getMonth() - 1)
    compTo.setMonth(compTo.getMonth() - 1)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)

    const baseRows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const compRows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', compFrom, compTo), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)

    const aggregate = (rows) => {
      const map = new Map()
      for (const venta of rows) {
        for (const detalle of venta.detalles ?? []) {
          const meta = getProductoMeta(detalle.inventario)
          const id = meta.id ?? detalle.IdArticulo
          if (!map.has(id)) map.set(id, { id, product: meta.nombre, quantity: 0, revenue: 0 })
          map.get(id).quantity += toNumber(detalle.Cantidad)
          map.get(id).revenue += toNumber(detalle.Cantidad) * toNumber(detalle.PrecioUnitario)
        }
      }
      return map
    }

    const baseMap = aggregate(baseRows)
    const compMap = aggregate(compRows)
    const keys = new Set([...baseMap.keys(), ...compMap.keys()])
    const entries = []
    for (const key of keys) {
      const base = baseMap.get(key) || { id: key, product: compMap.get(key)?.product || 'N/A', quantity: 0, revenue: 0 }
      const comp = compMap.get(key) || { id: key, product: base.product || 'N/A', quantity: 0, revenue: 0 }
      const baseAvgPrice = base.quantity > 0 ? base.revenue / base.quantity : 0
      const compareAvgPrice = comp.quantity > 0 ? comp.revenue / comp.quantity : 0
      const pctPrice = baseAvgPrice === 0 ? null : ((compareAvgPrice - baseAvgPrice) / baseAvgPrice) * 100
      const pctQty = base.quantity === 0 ? null : ((comp.quantity - base.quantity) / base.quantity) * 100
      const elasticity = (pctPrice === null || pctQty === null || pctPrice === 0) ? null : Number((pctQty / pctPrice).toFixed(4))
      entries.push({ id: base.id ?? comp.id, product: base.product ?? comp.product, baseAvgPrice: Number(baseAvgPrice.toFixed(2)), compareAvgPrice: Number(compareAvgPrice.toFixed(2)), baseQty: base.quantity, compareQty: comp.quantity, pctPriceChange: pctPrice === null ? null : Number(pctPrice.toFixed(2)), pctQtyChange: pctQty === null ? null : Number(pctQty.toFixed(2)), elasticity })
    }
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó elasticidad precio-demanda', `base:${from.toISOString()}-${to.toISOString()} vs comp:${compFrom.toISOString()}-${compTo.toISOString()}`)
    return { basePeriod: { from: from.toISOString(), to: to.toISOString() }, comparePeriod: { from: compFrom.toISOString(), to: compTo.toISOString() }, entries }
  }

  async getSalesByPaymentMethod(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const map = new Map()
    for (const venta of rows) {
      for (const pago of venta.pagos ?? []) {
        const method = pago.metodoPago?.Nombre ?? `Método ${pago.IdMetodoPago}`
        if (!map.has(method)) map.set(method, { method, total: 0, payments: 0 })
        map.get(method).total += toNumber(pago.Monto)
        map.get(method).payments += 1
      }
    }
    const methods = Array.from(map.values()).sort((a, b) => b.total - a.total)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ventas por forma de pago', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, methods }
  }

  async getSalesByBranch(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const rows = filterSalesByProduct(plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaIncludes(idSucursal), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const map = new Map()
    for (const venta of rows) {
      const idSucursal = venta.turnoCaja?.IdSucursal ?? null
      const branchName = venta.turnoCaja?.sucursal?.Nombre ?? `Sucursal ${idSucursal ?? 'N/A'}`
      const totalVenta = toNumber(venta.TotalVenta)
      const totalCosto = toNumber(venta.TotalCosto)
      const units = sum(venta.detalles ?? [], (detalle) => detalle.Cantidad)
      if (!map.has(idSucursal)) map.set(idSucursal, { id: idSucursal, sucursal: branchName, salesCount: 0, revenue: 0, cost: 0, units: 0 })
      const bucket = map.get(idSucursal)
      bucket.salesCount += 1
      bucket.revenue += totalVenta
      bucket.cost += totalCosto
      bucket.units += units
    }
    const branches = Array.from(map.values()).map((row) => {
      const margin = row.revenue - row.cost
      const marginPct = row.revenue > 0 ? Number(((margin / row.revenue) * 100).toFixed(2)) : 0
      return { ...row, avgTicket: row.salesCount > 0 ? Number((row.revenue / row.salesCount).toFixed(2)) : 0, margin: Number(margin.toFixed(2)), marginPct }
    }).sort((a, b) => b.revenue - a.revenue)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ventas por sucursal', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, branches }
  }

  async getDemandProjection(query = {}, ctx = null) {
    const elasticityResult = await this.getPriceElasticity(query, ctx)
    const priceChangePercent = Number(query.priceChangePercent || 10)
    const projected = []
    for (const entry of elasticityResult.entries || []) {
      const basePrice = entry.baseAvgPrice || 0
      const baseQty = entry.baseQty || 0
      const elasticity = entry.elasticity
      const newPrice = basePrice * (1 + priceChangePercent / 100)
      const projectedQty = elasticity !== null ? baseQty * (1 + ((elasticity * priceChangePercent) / 100)) : null
      projected.push({ id: entry.id, product: entry.product, basePrice, baseQty, elasticity, pctPrice: Number(priceChangePercent.toFixed(2)), newPrice: Number(newPrice.toFixed(2)), projectedQty: projectedQty === null ? null : Number(projectedQty.toFixed(2)) })
    }
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó proyección de demanda', `from=${elasticityResult.basePeriod.from} to=${elasticityResult.basePeriod.to}`)
    return { basePeriod: elasticityResult.basePeriod, comparePeriod: elasticityResult.comparePeriod, projection: projected }
  }
}

import { Op } from 'sequelize'
import { auditar } from '../../../core/utils/audit.util.js'
import { models } from '../../../models/index.js'
import { normalizeRange, periodKey, plainList, resolveIdSucursal, resolveProductId, toNumber } from '../dashboard.utils.js'

const VALID_GRAN = ['day', 'week', 'month', 'year']
const rangeToWhere = (field, from, to) => ({ [field]: { [Op.between]: [from, to] } })
const compraAttributes = ['Id', 'Fecha', 'TotalCosto', 'IdProveedor', 'IdSucursalDestino', 'IdEmpleado']

const buildCompraIncludes = () => ([
  { model: models.Proveedor, as: 'proveedor', attributes: ['Id', 'Nombre'], required: false },
  { 
    model: models.DetalleCompra, 
    as: 'detalles', 
    attributes: ['Id', 'Cantidad', 'PrecioCostoUnitario', 'IdArticulo'], 
    required: false, 
    include: [{ 
      model: models.Inventario, 
      as: 'inventario', 
      attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], 
      required: false,
      include: [{
        // CORRECCIÓN: Agregamos el Articulo para poder leer el nombre real
        model: models.Articulo,
        as: 'articulo',
        attributes: ['Id', 'Nombre', 'IdModeloArticulo'],
        required: false
      }]
    }] 
  },
])

const buildVentaDetalleIncludes = () => ([
  { model: models.DetalleVenta, as: 'detalles', attributes: ['Id', 'Cantidad', 'PrecioUnitario', 'IdArticulo'], required: false, include: [{ model: models.Inventario, as: 'inventario', attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'], required: false, include: [{ model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] }] }] },
])

const detalleMatchesModel = (detalle, productId) => {
  if (productId === null) return true;
  const idArt = detalle?.inventario?.IdProducto ?? detalle?.inventario?.IdArticulo ?? detalle?.IdArticulo;
  const idMod = detalle?.inventario?.articulo?.IdModeloArticulo;
  return Number(idArt) === Number(productId) || (idMod != null && Number(idMod) === Number(productId));
};

const hasProductInPurchase = (compra, productId) => {
  if (productId === null) return true
  return (compra.detalles ?? []).some((detalle) => detalleMatchesModel(detalle, productId))
}

const filterPurchasesByProduct = (rows, productId) => (productId === null ? rows : rows.filter((row) => hasProductInPurchase(row, productId)))

export default class ComprasDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService }

  _resolveRange(query = {}, defaultDays = 29) { return normalizeRange(query, defaultDays) }

  async getCostoEvolucion(query = {}, ctx = null) {
    const gran = VALID_GRAN.includes(String(query.granularity || '').toLowerCase()) ? String(query.granularity).toLowerCase() : 'day'
    const { from, to } = this._resolveRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = filterPurchasesByProduct(plainList(await models.Compra.findAll({ where, attributes: ['Id', 'Fecha', 'TotalCosto'], order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const buckets = new Map()
    for (const compra of rows) {
      const key = periodKey(compra.Fecha, gran)
      if (!buckets.has(key)) buckets.set(key, { period: key, totalCosto: 0 })
      buckets.get(key).totalCosto += toNumber(compra.TotalCosto)
    }
    const series = Array.from(buckets.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó evolución costo de compras', `gran=${gran}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series }
  }

  async getComprasPorProveedor(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 29)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = filterPurchasesByProduct(plainList(await models.Compra.findAll({ where, attributes: compraAttributes, include: buildCompraIncludes(), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const map = new Map()
    for (const compra of rows) {
      const id = compra.IdProveedor
      const proveedor = compra.proveedor?.Nombre ?? `Proveedor ${id}`
      if (!map.has(id)) map.set(id, { IdProveedor: id, proveedor, totalComprado: 0, comprasCount: 0 })
      const bucket = map.get(id)
      bucket.totalComprado += toNumber(compra.TotalCosto)
      bucket.comprasCount += 1
    }
    const proveedores = Array.from(map.values()).sort((a, b) => b.totalComprado - a.totalComprado)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó compras por proveedor', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), proveedores } }
  }

  async getRankingProveedores(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 29)
    const order = String(query.order || 'monto').toLowerCase()
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = filterPurchasesByProduct(plainList(await models.Compra.findAll({ where, attributes: compraAttributes, include: buildCompraIncludes(), order: [['Fecha', 'DESC']], limit: 1000 })), productId)
    const map = new Map()
    for (const compra of rows) {
      const id = compra.IdProveedor
      const proveedor = compra.proveedor?.Nombre ?? `Proveedor ${id}`
      if (!map.has(id)) map.set(id, { IdProveedor: id, proveedor, monto: 0, cantidadProductos: 0, frecuencia: 0, precioPromedio: 0 })
      const bucket = map.get(id)
      bucket.monto += toNumber(compra.TotalCosto)
      bucket.frecuencia += 1
      for (const detalle of compra.detalles ?? []) bucket.cantidadProductos += toNumber(detalle.Cantidad)
    }
    const entries = Array.from(map.values()).map((row) => ({ ...row, precioPromedio: row.cantidadProductos > 0 ? Number((row.monto / row.cantidadProductos).toFixed(2)) : 0 }))
    entries.sort((a, b) => {
      switch (order) {
        case 'cantidad': return b.cantidadProductos - a.cantidadProductos
        case 'frecuencia': return b.frecuencia - a.frecuencia
        case 'precio': return b.precioPromedio - a.precioPromedio
        case 'monto':
        default: return b.monto - a.monto
      }
    })
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, `Consultó ranking proveedores orden=${order}`, `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries }
  }

  async getEvolucionPrecioProducto(query = {}, ctx = null) {
    const productId = resolveProductId(query)
    if (productId === null) throw new Error('productId is required')
    const gran = VALID_GRAN.includes(String(query.granularity || '').toLowerCase()) ? String(query.granularity).toLowerCase() : 'month'
    const { from, to } = this._resolveRange(query, 150)
    const idSucursal = resolveIdSucursal(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = plainList(await models.Compra.findAll({ where, attributes: compraAttributes, include: buildCompraIncludes(), order: [['Fecha', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const compra of rows) {
      const key = periodKey(compra.Fecha, gran)
      for (const detalle of compra.detalles ?? []) {
        if (!detalleMatchesModel(detalle, productId)) continue
        if (!map.has(key)) map.set(key, { period: key, total: 0, count: 0 })
        const bucket = map.get(key)
        bucket.total += toNumber(detalle.PrecioCostoUnitario)
        bucket.count += 1
      }
    }
    const series = Array.from(map.values()).map((row) => ({ period: row.period, avgPrecio: row.count > 0 ? Number((row.total / row.count).toFixed(2)) : 0 })).sort((a, b) => String(a.period).localeCompare(String(b.period)))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó evolución precio de compra', `producto=${productId}`)
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series }
  }

  async getVariacionPrecioProveedor(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 89)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = plainList(await models.Compra.findAll({ where, attributes: compraAttributes, include: buildCompraIncludes(), order: [['Fecha', 'ASC']], limit: 1000 }))
    const map = new Map()
    for (const compra of rows) {
      for (const detalle of compra.detalles ?? []) {
        if (!detalleMatchesModel(detalle, productId)) continue
        const id = compra.IdProveedor
        if (!map.has(id)) map.set(id, { id, proveedor: compra.proveedor?.Nombre ?? `Proveedor ${id}`, prices: [] })
        map.get(id).prices.push(toNumber(detalle.PrecioCostoUnitario))
      }
    }
    const data = Array.from(map.values())
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó variación precio por proveedor', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, data }
  }

  async getABCCompras(query = {}, ctx = null) {
    const { from, to } = this._resolveRange(query, 149)
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)
    const where = { ...rangeToWhere('Fecha', from, to) }
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    const rows = filterPurchasesByProduct(plainList(await models.Compra.findAll({ where, attributes: compraAttributes, include: buildCompraIncludes(), order: [['Fecha', 'ASC']], limit: 1000 })), productId)
    const map = new Map()
    for (const compra of rows) {
      for (const detalle of compra.detalles ?? []) {
        const id = detalle.inventario?.IdArticulo ?? detalle.IdArticulo
        // CORRECCIÓN: Leemos el nombre real que unimos en buildCompraIncludes
        const nombreReal = detalle.inventario?.articulo?.Nombre ?? `Producto ${id}`
        if (!map.has(id)) map.set(id, { id, producto: nombreReal, total: 0 })
        map.get(id).total += toNumber(detalle.Cantidad) * toNumber(detalle.PrecioCostoUnitario)
      }
    }
    const rowsSorted = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const totalSum = rowsSorted.reduce((s, r) => s + r.total, 0)
    let cumulative = 0
    const entries = rowsSorted.map((row) => {
      const pct = totalSum > 0 ? (row.total / totalSum) * 100 : 0
      cumulative += pct
      let cls = 'C'
      if (cumulative <= 80) cls = 'A'
      else if (cumulative <= 95) cls = 'B'
      return { id: row.id, producto: row.producto, total: Number(row.total.toFixed(2)), percentage: Number(pct.toFixed(2)), cumulative: Number(cumulative.toFixed(2)), class: cls }
    })
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ABC de compras', `from=${from.toISOString()} to=${to.toISOString()}`)
    return { period: { from: from.toISOString(), to: to.toISOString() }, total: totalSum, entries }
  }

  async getPuntoReposicion(query = {}, ctx = null) {
    const productId = resolveProductId(query)
    if (productId === null) throw new Error('productId is required')
    const days = Number(query.days) || 90
    const leadTime = Number(query.leadTimeDays) || 7
    const { from, to } = this._resolveRange(query, days)
    const idSucursal = resolveIdSucursal(query)
    const rows = plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaDetalleIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 }))
    let totalQty = 0
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const id = detalle.inventario?.IdProducto ?? detalle.inventario?.IdArticulo
        if (Number(id) === Number(productId)) totalQty += toNumber(detalle.Cantidad)
      }
    }
    const avgDaily = totalQty / days
    const reorderPoint = avgDaily * leadTime
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó punto de reposición', `producto=${productId}`)
    return { productoId: productId, periodDays: days, avgDailyDemand: Number(avgDaily.toFixed(4)), leadTimeDays: leadTime, reorderPoint: Number(reorderPoint.toFixed(4)) }
  }

  async getStockSeguridad(query = {}, ctx = null) {
    const productId = resolveProductId(query)
    if (productId === null) throw new Error('productId is required')
    const days = Number(query.days) || 90
    const leadTime = Number(query.leadTimeDays) || 7
    const serviceLevel = Number(query.serviceLevel) || 0.95
    const zMap = { '0.9': 1.28, '0.95': 1.65, '0.99': 2.33 }
    const z = zMap[String(serviceLevel)] || 1.65
    const { from, to } = this._resolveRange(query, days)
    const idSucursal = resolveIdSucursal(query)
    const rows = plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaDetalleIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 }))
    const daily = new Map()
    for (const venta of rows) {
      const key = String(venta.Fecha).slice(0, 10)
      if (!daily.has(key)) daily.set(key, 0)
      for (const detalle of venta.detalles ?? []) {
        const id = detalle.inventario?.IdProducto ?? detalle.inventario?.IdArticulo
        if (Number(id) === Number(productId)) daily.set(key, daily.get(key) + toNumber(detalle.Cantidad))
      }
    }
    const values = Array.from(daily.values())
    const mean = values.reduce((s, x) => s + x, 0) / Math.max(1, values.length)
    const variance = values.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / Math.max(1, values.length)
    const sd = Math.sqrt(variance)
    const safetyStock = z * (sd * Math.sqrt(leadTime))
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó stock de seguridad', `producto=${productId}`)
    return { productoId: productId, meanDaily: Number(mean.toFixed(4)), sdDaily: Number(sd.toFixed(4)), leadTimeDays: leadTime, serviceLevel, z, safetyStock: Number(safetyStock.toFixed(4)) }
  }

  async getEOQ(query = {}, ctx = null) {
    const productId = resolveProductId(query)
    if (productId === null) throw new Error('productId is required')
    const days = Number(query.days) || 365
    const { from, to } = this._resolveRange(query, days)
    const idSucursal = resolveIdSucursal(query)
    const rows = plainList(await models.Venta.findAll({ where: rangeToWhere('Fecha', from, to), include: buildVentaDetalleIncludes(idSucursal), order: [['Fecha', 'ASC']], limit: 1000 }))
    let qty = 0
    for (const venta of rows) {
      for (const detalle of venta.detalles ?? []) {
        const id = detalle.inventario?.IdProducto ?? detalle.inventario?.IdArticulo
        if (Number(id) === Number(productId)) qty += toNumber(detalle.Cantidad)
      }
    }
    const annualDemand = (qty / Math.max(1, days)) * 365
    const orderingCost = Number(query.orderingCost || query.S || 50)
    let holdingCost = Number(query.holdingCost || 0)
    if (!holdingCost) holdingCost = query.holdingCostPercent && query.unitCost ? Number(query.holdingCostPercent) * Number(query.unitCost) : 1
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost)
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó EOQ', `producto=${productId}`)
    return { productoId: productId, annualDemand: Number(annualDemand.toFixed(2)), orderingCost, holdingCost: Number(holdingCost.toFixed(4)), eoq: Number(eoq.toFixed(2)) }
  }
}
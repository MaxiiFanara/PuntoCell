import { Op } from 'sequelize'
import { models } from '../../models/index.js'
import { auditar } from '../../core/utils/audit.util.js'
import { resolveIdSucursal, resolveProductId } from '../dashboard/dashboard.utils.js'

const DEFAULT_LIMIT = 20

const toNumber = (value) => Number(value) || 0

const parseDate = (value, fallback = null) => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

const normalizeRange = (query = {}, fallbackDays = 30) => {
  let to = parseDate(query.to, new Date())
  let from = parseDate(query.from, null)
  if (!from) {
    const nextFrom = new Date(to)
    nextFrom.setDate(nextFrom.getDate() - fallbackDays)
    from = nextFrom
  }
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

const pad = (value) => String(value).padStart(2, '0')

const periodKey = (value, groupBy = 'day') => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  switch (String(groupBy).toLowerCase()) {
    case 'week': {
      const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = utc.getUTCDay() || 7
      utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
      const year = utc.getUTCFullYear()
      const yearStart = new Date(Date.UTC(year, 0, 1))
      const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7)
      return `${year}-${pad(week)}`
    }
    case 'month': return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    case 'year': return `${date.getFullYear()}`
    case 'day':
    default: return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
}

const plain = (item) => (item?.get ? item.get({ plain: true }) : item)
const plainList = (items = []) => items.map(plain)

const sortDesc = (rows, limit = null) => {
  const sorted = [...rows].sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0) || (b.totalCount ?? 0) - (a.totalCount ?? 0))
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

const includesForProducto = () => ([
  {
    model: models.Articulo,
    as: 'articulo',
    attributes: ['Id', 'Nombre', 'IdModeloArticulo'],
    required: false,
    include: [{
      model: models.ModeloArticulo,
      as: 'modelo',
      attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'],
      required: false,
      include: [
        { model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false },
        { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false },
      ]
    }]
  }
])

const includesForCompra = () => ([
  { model: models.Proveedor, as: 'proveedor', attributes: ['Id', 'Nombre'], required: false },
  { model: models.Sucursal, as: 'sucursalDestino', attributes: ['Id', 'Nombre'], required: false },
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  {
    model: models.DetalleCompra,
    as: 'detalles',
    attributes: ['Id', 'Cantidad', 'IdArticulo'],
    required: false,
    include: [{
      model: models.Inventario,
      as: 'inventario',
      attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'],
      required: false,
      include: includesForProducto()
    }]
  }
])

const includesForVenta = () => ([
  { model: models.TurnoCaja, as: 'turnoCaja', attributes: ['Id', 'IdSucursal'], required: false },
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.Usuario, as: 'cliente', attributes: ['Id', 'Nombre', 'Apellido', 'DNI'], required: false },
  {
    model: models.PagoVenta,
    as: 'pagos',
    attributes: ['Id', 'Monto', 'IdMetodoPago', 'FechaPago'],
    required: false,
    include: [{ model: models.MetodoPago, as: 'metodoPago', attributes: ['Id', 'Nombre'], required: false }]
  },
  {
    model: models.DetalleVenta,
    as: 'detalles',
    attributes: ['Id', 'Cantidad', 'PrecioUnitario', 'IdArticulo'],
    required: false,
    include: [{
      model: models.Inventario,
      as: 'inventario',
      attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'],
      required: false,
      include: includesForProducto()
    }]
  }
])

const includesForTurnoCaja = () => ([
  { model: models.Usuario, as: 'empleadoApertura', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.Usuario, as: 'empleadoCierre', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }
])

const includesForMovimientoCaja = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  { model: models.TurnoCaja, as: 'turnoCaja', attributes: ['Id', 'IdSucursal'], required: false }
])

const includesForMovimiento = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'], required: false },
  {
    model: models.Inventario,
    as: 'inventario',
    attributes: ['Id', 'IdArticulo', 'IdSucursal', 'Stock'],
    required: false,
    include: [
      { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
      ...includesForProducto()
    ]
  }
])

const includesForReparacion = () => ([
  { model: models.Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido', 'IdSucursal'], required: false, include: [{ model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false }] },
  { model: models.EstadoOrden, as: 'estado', attributes: ['Id', 'Nombre'], required: false },
  {
    model: models.DispositivoCliente,
    as: 'dispositivo',
    attributes: ['Id', 'IdModeloArticulo', 'IdCliente'],
    required: false,
    include: [{
      model: models.ModeloArticulo,
      as: 'modelo',
      attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'],
      required: false,
      include: [
        { model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false },
        { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false },
      ]
    }]
  },
  {
    model: models.Falla,
    as: 'fallas',
    through: { attributes: [] },
    attributes: ['Id', 'Nombre'],
    required: false,
  }
])

const getProductoMeta = (inventario) => {
  const articulo = inventario?.articulo ?? {}
  const modelo = articulo?.modelo ?? {}
  return {
    id: inventario?.IdArticulo ?? inventario?.IdProducto ?? null,
    nombre: articulo?.Nombre ?? inventario?.Nombre ?? 'Producto',
    idCategoria: modelo?.IdCategoriaArticulo ?? modelo?.IdCategoriaProducto ?? null,
    categoria: modelo?.categoria?.Nombre ?? 'Categoría',
    idMarca: modelo?.IdMarcaArticulo ?? modelo?.IdMarcaProducto ?? null,
    marca: modelo?.marca?.Nombre ?? 'Marca',
  }
}

const getRepairMeta = (reparacion) => {
  const modelo = reparacion?.dispositivo?.modelo ?? {}
  return {
    technicianId: reparacion?.IdEmpleado ?? null,
    deviceTypeId: modelo?.IdCategoriaArticulo ?? modelo?.IdCategoriaProducto ?? null,
    brandId: modelo?.IdMarcaArticulo ?? modelo?.IdMarcaProducto ?? null,
    failureIds: (reparacion?.fallas ?? []).map((falla) => falla.Id),
  }
}

export default class ReportesService {
  constructor(bitacoraService = null) {
    this.bitacoraService = bitacoraService
  }

  async getComprasReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const groupBy = String(query.groupBy || 'month').toLowerCase()
    const reportType = String(query.reportType || 'gasto').toLowerCase()
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)

    const where = { Fecha: { [Op.between]: [from, to] } }
    if (query.supplierId) where.IdProveedor = Number(query.supplierId)
    if (idSucursal !== null) where.IdSucursalDestino = idSucursal
    if (query.employeeId) where.IdEmpleado = Number(query.employeeId)

    let rows = plainList(await models.Compra.findAll({ where, include: includesForCompra(), order: [['Fecha', 'DESC']] }))

    if (productId !== null || query.categoryId) {
      rows = rows.filter((compra) => (compra.detalles ?? []).some((detalle) => {
        const meta = getProductoMeta(detalle.inventario)
        if (productId !== null && Number(meta.id) !== Number(productId)) return false
        if (query.categoryId && Number(meta.idCategoria) !== Number(query.categoryId)) return false
        return true
      }))
    }

    const byPeriod = new Map()
    const byProvider = new Map()

    for (const compra of rows) {
      const period = periodKey(compra.Fecha, groupBy)
      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalCount: 0, totalAmount: 0 })
      const periodBucket = byPeriod.get(period)
      periodBucket.totalCount += 1
      periodBucket.totalAmount += toNumber(compra.TotalCosto)

      const providerId = compra.IdProveedor
      const providerName = compra.proveedor?.Nombre ?? `Proveedor ${providerId}`
      if (!byProvider.has(providerId)) byProvider.set(providerId, { id: providerId, name: providerName, totalCount: 0, totalAmount: 0 })
      const providerBucket = byProvider.get(providerId)
      providerBucket.totalCount += 1
      providerBucket.totalAmount += toNumber(compra.TotalCosto)
    }

    let resultRows
    switch (reportType) {
      case 'proveedores':
      case 'ranking':
        resultRows = sortDesc(Array.from(byProvider.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      case 'detalle':
        resultRows = rows.map((compra) => ({
          id: compra.Id,
          period: periodKey(compra.Fecha, groupBy),
          supplierId: compra.IdProveedor,
          supplier: compra.proveedor?.Nombre ?? null,
          branchId: compra.IdSucursalDestino,
          branch: compra.sucursalDestino?.Nombre ?? null,
          employeeId: compra.IdEmpleado,
          employee: [compra.empleado?.Nombre, compra.empleado?.Apellido].filter(Boolean).join(' '),
          status: compra.EstadoPago,
          totalAmount: toNumber(compra.TotalCosto),
          detailsCount: compra.detalles?.length ?? 0,
        }))
        break
      default:
        resultRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
        break
    }

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte compras', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, groupBy, rows: resultRows }
  }

  async getVentasReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const groupBy = String(query.groupBy || 'month').toLowerCase()
    const reportType = String(query.reportType || 'facturacion').toLowerCase()
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)

    const where = { Fecha: { [Op.between]: [from, to] } }
    if (query.employeeId) where.IdEmpleado = Number(query.employeeId)
    if (query.customerId) where.IdCliente = Number(query.customerId)

    let rows = plainList(await models.Venta.findAll({ where, include: includesForVenta(), order: [['Fecha', 'DESC']] }))

    if (idSucursal !== null) {
      rows = rows.filter((venta) => Number(venta.turnoCaja?.IdSucursal) === idSucursal)
    }
    if (query.paymentMethodId) {
      const paymentMethodId = Number(query.paymentMethodId)
      rows = rows.filter((venta) => (venta.pagos ?? []).some((pago) => Number(pago.IdMetodoPago) === paymentMethodId))
    }
    if (productId !== null || query.categoryId) {
      rows = rows.filter((venta) => (venta.detalles ?? []).some((detalle) => {
        const meta = getProductoMeta(detalle.inventario)
        if (productId !== null && Number(meta.id) !== Number(productId)) return false
        if (query.categoryId && Number(meta.idCategoria) !== Number(query.categoryId)) return false
        return true
      }))
    }

    const byPeriod = new Map()
    const byMethod = new Map()
    const bySeller = new Map()
    const byProduct = new Map()

    for (const venta of rows) {
      const period = periodKey(venta.Fecha, groupBy)
      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalCount: 0, totalAmount: 0, totalCost: 0 })
      const periodBucket = byPeriod.get(period)
      periodBucket.totalCount += 1
      periodBucket.totalAmount += toNumber(venta.TotalVenta)
      periodBucket.totalCost += toNumber(venta.TotalCosto)

      const sellerId = venta.IdEmpleado
      const sellerName = [venta.empleado?.Nombre, venta.empleado?.Apellido].filter(Boolean).join(' ') || `Empleado ${sellerId}`
      if (!bySeller.has(sellerId)) bySeller.set(sellerId, { id: sellerId, name: sellerName, totalCount: 0, totalAmount: 0 })
      const sellerBucket = bySeller.get(sellerId)
      sellerBucket.totalCount += 1
      sellerBucket.totalAmount += toNumber(venta.TotalVenta)

      for (const pago of venta.pagos ?? []) {
        const methodId = pago.IdMetodoPago
        const methodName = pago.metodoPago?.Nombre ?? `Método ${methodId}`
        if (!byMethod.has(methodId)) byMethod.set(methodId, { id: methodId, name: methodName, totalCount: 0, totalAmount: 0 })
        const methodBucket = byMethod.get(methodId)
        methodBucket.totalCount += 1
        methodBucket.totalAmount += toNumber(pago.Monto)
      }

      for (const detalle of venta.detalles ?? []) {
        const meta = getProductoMeta(detalle.inventario)
        const productId = meta.id ?? detalle.IdArticulo
        if (!byProduct.has(productId)) byProduct.set(productId, { id: productId, name: meta.nombre, totalCount: 0, totalAmount: 0 })
        const productBucket = byProduct.get(productId)
        productBucket.totalCount += toNumber(detalle.Cantidad)
        productBucket.totalAmount += toNumber(detalle.Cantidad) * toNumber(detalle.PrecioUnitario)
      }
    }

    let resultRows
    switch (reportType) {
      case 'forma-pago':
        resultRows = sortDesc(Array.from(byMethod.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      case 'pareto':
        resultRows = sortDesc(Array.from(byProduct.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      case 'vendedor':
        resultRows = sortDesc(Array.from(bySeller.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      case 'detalle':
        resultRows = rows.map((venta) => ({
          id: venta.Id,
          period: periodKey(venta.Fecha, groupBy),
          branchId: venta.turnoCaja?.IdSucursal ?? null,
          employeeId: venta.IdEmpleado,
          employee: [venta.empleado?.Nombre, venta.empleado?.Apellido].filter(Boolean).join(' '),
          customerId: venta.IdCliente,
          customer: [venta.cliente?.Nombre, venta.cliente?.Apellido].filter(Boolean).join(' '),
          totalAmount: toNumber(venta.TotalVenta),
          totalCost: toNumber(venta.TotalCosto),
          paymentMethods: (venta.pagos ?? []).map((pago) => pago.metodoPago?.Nombre ?? `Método ${pago.IdMetodoPago}`),
          detailsCount: venta.detalles?.length ?? 0,
        }))
        break
      default:
        resultRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
        break
    }

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte ventas', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, groupBy, rows: resultRows }
  }

  async getInventarioReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const groupBy = String(query.groupBy || 'month').toLowerCase()
    const reportType = String(query.reportType || 'movimientos').toLowerCase()
    const idSucursal = resolveIdSucursal(query)
    const productId = resolveProductId(query)

    const where = { Fecha: { [Op.between]: [from, to] } }
    if (query.employeeId) where.IdEmpleado = Number(query.employeeId)

    let rows = plainList(await models.MovimientoStock.findAll({ where, include: includesForMovimiento(), order: [['Fecha', 'DESC']] }))

    if (idSucursal !== null) {
      rows = rows.filter((movimiento) => Number(movimiento.inventario?.IdSucursal) === idSucursal)
    }
    if (productId !== null || query.categoryId) {
      rows = rows.filter((movimiento) => {
        const meta = getProductoMeta(movimiento.inventario)
        if (productId !== null && Number(meta.id) !== Number(productId)) return false
        if (query.categoryId && Number(meta.idCategoria) !== Number(query.categoryId)) return false
        return true
      })
    }
    if (query.movementType) rows = rows.filter((movimiento) => String(movimiento.TipoMovimiento ?? '').toLowerCase().includes(String(query.movementType).toLowerCase()))
    if (query.reason) rows = rows.filter((movimiento) => String(movimiento.Observaciones ?? '').toLowerCase().includes(String(query.reason).toLowerCase()))

    const byPeriod = new Map()
    const byMovement = new Map()

    for (const movimiento of rows) {
      const period = periodKey(movimiento.Fecha, groupBy)
      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalCount: 0, totalQuantity: 0 })
      const periodBucket = byPeriod.get(period)
      periodBucket.totalCount += 1
      periodBucket.totalQuantity += toNumber(movimiento.Cantidad)

      const movementType = movimiento.TipoMovimiento
      if (!byMovement.has(movementType)) byMovement.set(movementType, { movementType, totalCount: 0, totalQuantity: 0 })
      const movementBucket = byMovement.get(movementType)
      movementBucket.totalCount += 1
      movementBucket.totalQuantity += toNumber(movimiento.Cantidad)
    }

    let resultRows
    switch (reportType) {
      case 'movimientos':
        resultRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))
        break
      case 'stock-bajo': {
        const inventoryRows = plainList(await models.Inventario.findAll({
          include: [
            { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
            { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre'], required: false, include: includesForProducto()[0].include },
          ],
          order: [['Stock', 'ASC']]
        }))
        const stockLimit = Number(query.stockMax ?? query.limitStock ?? 20)
        resultRows = inventoryRows.filter((inventario) => {
          if (idSucursal !== null && Number(inventario.IdSucursal) !== idSucursal) return false
          if (productId !== null && Number(inventario.IdArticulo) !== Number(productId)) return false
          if (query.categoryId) {
            const categoryId = inventario.articulo?.modelo?.IdCategoriaArticulo ?? inventario.articulo?.modelo?.IdCategoriaProducto
            if (Number(categoryId) !== Number(query.categoryId)) return false
          }
          return toNumber(inventario.Stock) <= stockLimit
        }).map((inventario) => ({
          id: inventario.Id,
          name: inventario.articulo?.Nombre ?? `Inventario ${inventario.Id}`,
          stock: toNumber(inventario.Stock),
          branchId: inventario.IdSucursal,
          branch: inventario.sucursal?.Nombre ?? null,
        }))
        break
      }
      case 'sin-rotacion': {
        const inventoryRows = plainList(await models.Inventario.findAll({
          include: [
            { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
            { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre'], required: false, include: includesForProducto()[0].include },
            { model: models.MovimientoStock, as: 'movimientos', attributes: ['Id', 'Fecha', 'TipoMovimiento', 'Cantidad'], required: false },
          ],
          order: [['Id', 'ASC']]
        }))
        const minDays = Number(query.days) || 30
        resultRows = inventoryRows.map((inventario) => {
          const movimientos = inventario.movimientos ?? []
          const lastMovement = movimientos.reduce((latest, movimiento) => {
            const date = new Date(movimiento.Fecha)
            if (Number.isNaN(date.getTime())) return latest
            return !latest || date > latest ? date : latest
          }, null)
          const daysWithoutMovement = lastMovement ? Math.max(0, Math.floor((Date.now() - lastMovement.getTime()) / 86400000)) : null
          return {
            id: inventario.Id,
            name: inventario.articulo?.Nombre ?? `Inventario ${inventario.Id}`,
            stock: toNumber(inventario.Stock),
            lastMovement: lastMovement ? lastMovement.toISOString() : null,
            daysWithoutMovement,
          }
        }).filter((item) => item.daysWithoutMovement === null || item.daysWithoutMovement >= minDays)
        break
      }
      case 'valorizacion': {
        const inventoryRows = plainList(await models.Inventario.findAll({
          include: [
            { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
            { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre'], required: false, include: includesForProducto()[0].include },
            { model: models.PrecioArticulo, as: 'precios', attributes: ['Id', 'CostoReal', 'CostoBase', 'FechaDesde', 'FechaHasta'], required: false },
          ]
        }))
        resultRows = inventoryRows.filter((inventario) => {
          if (idSucursal !== null && Number(inventario.IdSucursal) !== idSucursal) return false
          if (productId !== null && Number(inventario.IdArticulo) !== Number(productId)) return false
          if (query.categoryId) {
            const categoryId = inventario.articulo?.modelo?.IdCategoriaArticulo ?? inventario.articulo?.modelo?.IdCategoriaProducto
            if (Number(categoryId) !== Number(query.categoryId)) return false
          }
          return true
        }).map((inventario) => {
          const vigente = (inventario.precios ?? []).find((precio) => !precio.FechaHasta)
            || [...(inventario.precios ?? [])].sort((a, b) => new Date(b.FechaDesde) - new Date(a.FechaDesde))[0]
          const costo = toNumber(vigente?.CostoReal ?? vigente?.CostoBase)
          return {
            id: inventario.Id,
            name: inventario.articulo?.Nombre ?? `Inventario ${inventario.Id}`,
            stock: toNumber(inventario.Stock),
            unitCost: costo,
            totalAmount: toNumber(inventario.Stock) * costo,
          }
        }).sort((a, b) => b.totalAmount - a.totalAmount)
        break
      }
      default:
        resultRows = Array.from(byMovement.values()).sort((a, b) => String(a.movementType).localeCompare(String(b.movementType)))
        break
    }

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte inventario', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, groupBy, rows: resultRows }
  }

  async getReparacionesReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const groupBy = String(query.groupBy || 'month').toLowerCase()
    const reportType = String(query.reportType || 'productividad').toLowerCase()
    const idSucursal = resolveIdSucursal(query)

    const where = { FechaEmision: { [Op.between]: [from, to] } }
    if (query.technicianId) where.IdEmpleado = Number(query.technicianId)
    if (query.statusId) where.IdEstadoOrden = Number(query.statusId)

    let rows = plainList(await models.OrdenReparacion.findAll({ where, include: includesForReparacion(), order: [['FechaEmision', 'DESC']] }))

    if (idSucursal !== null) {
      rows = rows.filter((reparacion) => Number(reparacion.empleado?.IdSucursal) === idSucursal)
    }

    if (query.deviceTypeId || query.brandId || query.failureId) {
      rows = rows.filter((reparacion) => {
        const meta = getRepairMeta(reparacion)
        if (query.deviceTypeId && Number(meta.deviceTypeId) !== Number(query.deviceTypeId)) return false
        if (query.brandId && Number(meta.brandId) !== Number(query.brandId)) return false
        if (query.failureId && !meta.failureIds.some((id) => Number(id) === Number(query.failureId))) return false
        return true
      })
    }

    const byPeriod = new Map()
    const byFailure = new Map()
    const byTechnician = new Map()

    for (const reparacion of rows) {
      const period = periodKey(reparacion.FechaEmision, groupBy)
      const duration = reparacion.FechaEntrega ? Math.max(0, Math.floor((new Date(reparacion.FechaEntrega) - new Date(reparacion.FechaEmision)) / 86400000)) : null

      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalCount: 0, avgDaysTotal: 0, avgDaysCount: 0, totalAmount: 0 })
      const periodBucket = byPeriod.get(period)
      periodBucket.totalCount += 1
      if (duration !== null) {
        periodBucket.avgDaysTotal += duration
        periodBucket.avgDaysCount += 1
      }
      periodBucket.totalAmount += toNumber(reparacion.TotalReparacion)

      const techId = reparacion.IdEmpleado
      const techName = [reparacion.empleado?.Nombre, reparacion.empleado?.Apellido].filter(Boolean).join(' ') || `Empleado ${techId}`
      if (!byTechnician.has(techId)) byTechnician.set(techId, { id: techId, name: techName, totalCount: 0, totalAmount: 0 })
      const techBucket = byTechnician.get(techId)
      techBucket.totalCount += 1
      techBucket.totalAmount += toNumber(reparacion.TotalReparacion)

      for (const falla of reparacion.fallas ?? []) {
        const failureId = falla.Id
        const failureName = falla.Nombre ?? `Falla ${failureId}`
        if (!byFailure.has(failureId)) byFailure.set(failureId, { id: failureId, name: failureName, totalCount: 0, totalAmount: 0 })
        const failureBucket = byFailure.get(failureId)
        failureBucket.totalCount += 1
        failureBucket.totalAmount += toNumber(reparacion.TotalReparacion - reparacion.CostoRepuestos)
      }
    }

    let resultRows
    switch (reportType) {
      case 'fallas':
        resultRows = sortDesc(Array.from(byFailure.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      case 'tiempos':
        resultRows = Array.from(byPeriod.values()).map((item) => ({
          period: item.period,
          avgDays: item.avgDaysCount > 0 ? Number((item.avgDaysTotal / item.avgDaysCount).toFixed(2)) : 0,
          totalCount: item.totalCount,
        })).sort((a, b) => String(a.period).localeCompare(String(b.period)))
        break
      case 'rentabilidad':
        resultRows = sortDesc(Array.from(byFailure.values()), Number(query.limit) || DEFAULT_LIMIT)
        break
      default:
        resultRows = Array.from(byPeriod.values()).map((item) => ({
          period: item.period,
          totalCount: item.totalCount,
          avgDays: item.avgDaysCount > 0 ? Number((item.avgDaysTotal / item.avgDaysCount).toFixed(2)) : 0,
          totalAmount: item.totalAmount,
        })).sort((a, b) => String(a.period).localeCompare(String(b.period)))
        break
    }

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte reparaciones', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, groupBy, rows: resultRows }
  }

  async getCajaReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const reportType = String(query.reportType || 'cierres').toLowerCase()
    const idSucursal = resolveIdSucursal(query)

    let resultRows = []

    if (reportType === 'movimientos') {
      const where = { Fecha: { [Op.between]: [from, to] } }
      let rows = plainList(await models.MovimientoCaja.findAll({ where, include: includesForMovimientoCaja(), order: [['Fecha', 'DESC']] }))
      
      if (idSucursal !== null) {
        rows = rows.filter(m => Number(m.turnoCaja?.IdSucursal) === idSucursal)
      }

      resultRows = rows.map(mov => ({
        id: mov.Id,
        turnId: mov.IdTurnoCaja,
        period: mov.Fecha,
        movementType: mov.TipoMovimiento,
        totalAmount: toNumber(mov.Monto),
        description: mov.Motivo || mov.Descripcion || '—',
        employee: [mov.empleado?.Nombre, mov.empleado?.Apellido].filter(Boolean).join(' ') || `Empleado ${mov.IdEmpleado}`
      }))
    } else {
      // Para 'cierres' y 'arqueos'
      const where = { FechaApertura: { [Op.between]: [from, to] } }
      if (idSucursal !== null) where.IdSucursal = idSucursal

      let rows = plainList(await models.TurnoCaja.findAll({ where, include: includesForTurnoCaja(), order: [['FechaApertura', 'DESC']] }))

      resultRows = rows.map(turno => {
        const esperado = toNumber(turno.MontoEsperado || turno.TotalCalculado || 0)
        const real = toNumber(turno.MontoReal || turno.TotalCierre || 0)
        const nombreCajero = [turno.empleadoApertura?.Nombre, turno.empleadoApertura?.Apellido].filter(Boolean).join(' ') 
          || `Cajero ${turno.IdEmpleadoApertura || 'Desconocido'}`
        return {
          id: turno.Id,
          turnId: turno.Id,
          branchId: turno.IdSucursal,
          branch: turno.sucursal?.Nombre || '—',
          cashier: nombreCajero,
          openingDate: turno.FechaApertura,
          closingDate: turno.FechaCierre || '—',
          expectedAmount: esperado,
          actualAmount: real,
          cashDifference: real - esperado
        }
      })

      if (reportType === 'arqueos') {
        // Filtramos solo los turnos donde hubo diferencia de plata
        resultRows = resultRows.filter(r => r.cashDifference !== 0)
      }
    }

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte caja', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, rows: resultRows }
  }

  // 🔥 NUEVOS REPORTES DE FINANZAS
  async getFinanzasReport(query = {}, ctx = null) {
    const { from, to } = normalizeRange(query, 30)
    const groupBy = String(query.groupBy || 'month').toLowerCase()
    const reportType = String(query.reportType || 'flujo-caja').toLowerCase()
    const idSucursal = resolveIdSucursal(query)

    // Buscamos Ventas
    const whereVentas = { Fecha: { [Op.between]: [from, to] } }
    let ventas = plainList(await models.Venta.findAll({ where: whereVentas, include: includesForVenta() }))
    if (idSucursal !== null) ventas = ventas.filter(v => Number(v.turnoCaja?.IdSucursal) === idSucursal)

    // Buscamos Compras
    const whereCompras = { Fecha: { [Op.between]: [from, to] } }
    if (idSucursal !== null) whereCompras.IdSucursalDestino = idSucursal
    const compras = plainList(await models.Compra.findAll({ where: whereCompras }))

    const byPeriod = new Map()

    // Procesamos Ingresos (Ventas)
    for (const venta of ventas) {
      const period = periodKey(venta.Fecha, groupBy)
      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalIncome: 0, totalExpense: 0, totalSalesCost: 0 })
      const bucket = byPeriod.get(period)
      bucket.totalIncome += toNumber(venta.TotalVenta)
      bucket.totalSalesCost += toNumber(venta.TotalCosto) // Para calcular rentabilidad pura
    }

    // Procesamos Egresos (Compras)
    for (const compra of compras) {
      const period = periodKey(compra.Fecha, groupBy)
      if (!byPeriod.has(period)) byPeriod.set(period, { period, totalIncome: 0, totalExpense: 0, totalSalesCost: 0 })
      const bucket = byPeriod.get(period)
      bucket.totalExpense += toNumber(compra.TotalCosto)
    }

    let resultRows = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)))

    resultRows = resultRows.map(item => {
      if (reportType === 'rentabilidad') {
        return {
          period: item.period,
          totalAmount: item.totalIncome, // Ingresos por venta
          totalCost: item.totalSalesCost, // Costo de la mercadería vendida
          netProfit: item.totalIncome - item.totalSalesCost // Rentabilidad neta sobre ventas
        }
      }
      return {
        period: item.period,
        totalIncome: item.totalIncome,
        totalExpense: item.totalExpense,
        netProfit: item.totalIncome - item.totalExpense // Flujo de caja libre (Ingresos - Egresos generales)
      }
    })

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Reporte finanzas', reportType)
    return { reportType, period: { from: from.toISOString(), to: to.toISOString() }, groupBy, rows: resultRows }
  }
}

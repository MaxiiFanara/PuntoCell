import { fetchApi, getEmpleados, getOrdenes } from '../../../services/api'
import { preciosService, mapVigentePorInventario, resolverPrecioInventario, idsListasMayoristas } from '../../../services/preciosServices'

const toNumber = (value) => Number(value) || 0
const formatMoney = (value) => `U$S ${Math.round(toNumber(value)).toLocaleString('es-AR')}`

const buildRange = (days) => {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - days)
  return { from: from.toISOString(), to: to.toISOString() }
}

const normalizeUiRange = (range = null, fallbackDays = 30) => {
  if (range?.from && range?.to) {
    const from = new Date(range.from)
    from.setHours(0, 0, 0, 0)
    const to = new Date(range.to)
    to.setHours(23, 59, 59, 999)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  return buildRange(fallbackDays)
}

const buildQuery = (params = {}) => new URLSearchParams(
  Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value
    return acc
  }, {})
).toString()

const fetchData = async (path) => {
  const res = await fetchApi(path)
  return res?.data ?? res ?? []
}

const sum = (items, selector) => (items ?? []).reduce((total, item) => total + toNumber(selector(item)), 0)
const colorByIndex = (index, palette) => palette[index % palette.length]

const classifyControlAction = (action = '') => {
  const text = String(action).toLowerCase()
  if (text.includes('venta')) return 'Ventas'
  if (text.includes('compra')) return 'Compras'
  if (text.includes('anul')) return 'Anulaciones'
  if (text.includes('descuento')) return 'Descuentos'
  return null
}

const controlTotals = (result) => {
  const totals = { Ventas: 0, Compras: 0, Anulaciones: 0, Descuentos: 0 }
  const rows = (result?.matrix ?? []).map((row) => {
    const mapped = { empleado: row.empleado, Ventas: 0, Compras: 0, Anulaciones: 0, Descuentos: 0 }
    ;(result?.acciones ?? []).forEach((accion, index) => {
      const categoria = classifyControlAction(accion)
      if (categoria) {
        const value = toNumber(row.counts?.[index])
        mapped[categoria] += value
        totals[categoria] += value
      }
    })
    return mapped
  })

  return { rows, totals }
}

const buildControlTrend = async () => {
  const weeks = []
  const now = new Date()
  for (let offset = 3; offset >= 0; offset -= 1) {
    const to = new Date(now)
    to.setDate(to.getDate() - (offset * 7))
    const from = new Date(to)
    from.setDate(from.getDate() - 6)
    weeks.push({ from, to })
  }

  const weekly = await Promise.all(
    weeks.map(async ({ from, to }) => {
      const qs = buildQuery({ from: from.toISOString(), to: to.toISOString() })
      const result = await fetchData(`/dashboard/control/empleado-operacion?${qs}`)
      const { totals } = controlTotals(result)
      return {
        anulaciones: totals.Anulaciones,
        descuentos: totals.Descuentos,
      }
    })
  )

  return {
    xAxis: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    series: [
      { data: weekly.map((item) => item.anulaciones), label: 'Anulaciones', color: '#a93b32' },
      { data: weekly.map((item) => item.descuentos), label: 'Descuentos', color: '#dfa758' },
    ],
  }
}

const buildControlTrendFromRange = async (range = null) => {
  const normalized = normalizeUiRange(range, 30)
  const fromDate = new Date(normalized.from)
  const toDate = new Date(normalized.to)
  const diffDays = Math.max(1, Math.ceil((toDate - fromDate) / 86400000) + 1)
  const bucketSize = Math.max(1, Math.ceil(diffDays / 4))
  const buckets = []
  for (let offset = 3; offset >= 0; offset -= 1) {
    const bucketTo = new Date(toDate)
    bucketTo.setDate(bucketTo.getDate() - (offset * bucketSize))
    const bucketFrom = new Date(bucketTo)
    bucketFrom.setDate(bucketFrom.getDate() - (bucketSize - 1))
    buckets.push({ from: bucketFrom, to: bucketTo })
  }

  const weekly = await Promise.all(
    buckets.map(async ({ from, to }) => {
      const qs = buildQuery({ from: from.toISOString(), to: to.toISOString() })
      const result = await fetchData(`/dashboard/control/empleado-operacion?${qs}`)
      const { totals } = controlTotals(result)
      return {
        anulaciones: totals.Anulaciones,
        descuentos: totals.Descuentos,
      }
    })
  )

  return {
    xAxis: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    series: [
      { data: weekly.map((item) => item.anulaciones), label: 'Anulaciones', color: '#a93b32' },
      { data: weekly.map((item) => item.descuentos), label: 'Descuentos', color: '#dfa758' },
    ],
  }
}

const normalizeFailureBucket = (value = '') => {
  const text = String(value).toLowerCase()
  if (/pantalla|display|glass|m[oó]dulo/.test(text)) return 'pantalla'
  if (/bater[ií]a|battery/.test(text)) return 'bateria'
  if (/carga|cargador|conector|usb|pin/.test(text)) return 'pinCarga'
  if (/software|logo|sistema|boot|reinici|bloque/.test(text)) return 'software'
  return null
}

const deviceFailureMatrix = (ordenes = []) => {
  const devices = new Map()

  for (const orden of ordenes) {
    const dispositivo = orden.TipoDispositivo || orden.Tipo || orden.ModeloDispositivo || 'Sin tipo'
    const falla = orden.Falla || orden.Fallas?.[0] || 'Sin falla'
    const bucket = normalizeFailureBucket(falla)
    if (!bucket) continue

    if (!devices.has(dispositivo)) {
      devices.set(dispositivo, { dispositivo, pantalla: 0, bateria: 0, pinCarga: 0, software: 0 })
    }

    devices.get(dispositivo)[bucket] += 1
  }

  return Array.from(devices.values())
    .sort((a, b) => (b.pantalla + b.bateria + b.pinCarga + b.software) - (a.pantalla + a.bateria + a.pinCarga + a.software))
    .slice(0, 3)
}

const technicianPerformance = (ordenes = []) => {
  const byEmployee = new Map()

  for (const orden of ordenes) {
    const nombre = `${orden.NombreEmpleado ?? ''} ${orden.ApellidoEmpleado ?? ''}`.trim() || orden.NombreEmpleado || 'Sin asignar'
    const estado = String(orden.Estado ?? '').toLowerCase()
    const fechEmision = orden.FechaEmision ? new Date(orden.FechaEmision) : null
    const fechEntrega = orden.FechaEntrega ? new Date(orden.FechaEntrega) : null
    const delivered = estado.includes('entreg') || Boolean(fechEntrega)
    const current = byEmployee.get(nombre) || { nombre, exitosas: 0, devueltas: 0, totalDays: 0, totalDelivered: 0 }
    if (delivered) {
      current.exitosas += 1
      current.totalDelivered += 1
      if (fechEmision && fechEntrega) {
        const diffDays = Math.max(0, (fechEntrega - fechEmision) / 86400000)
        current.totalDays += diffDays
      }
    } else {
      current.devueltas += 1
    }
    byEmployee.set(nombre, current)
  }

  return Array.from(byEmployee.values())
    .sort((a, b) => b.exitosas - a.exitosas)
    .slice(0, 5)
    .map((item) => ({
      nombre: item.nombre,
      exitosas: item.exitosas,
      devueltas: item.devueltas,
      tiempoPromedio: item.totalDelivered > 0 ? Number((item.totalDays / item.totalDelivered).toFixed(2)) : 0,
      margenGen: item.exitosas + item.devueltas > 0 ? Math.round((item.exitosas / (item.exitosas + item.devueltas)) * 100) : 0,
    }))
}

const repairDemandProfitMatrix = (entries = []) => entries.slice(0, 5).map((entry, index) => ({
  id: String(entry.id ?? index + 1),
  servicio: entry.falla ?? entry.product ?? entry.marca ?? `Item ${index + 1}`,
  x: toNumber(entry.repairs ?? entry.count ?? entry.total ?? entry.salesCount),
  y: toNumber(entry.marginPct ?? entry.margenPct ?? entry.percentage ?? 0),
  z: toNumber(entry.revenue ?? entry.total ?? entry.margin ?? 0),
  color: colorByIndex(index, ['#4cbf93', '#12684e', '#dfa758', '#a39d93', '#a93b32']),
}))

const buildEOQCurve = (eoqData = null) => {
  const eoq = toNumber(eoqData?.eoq)
  const demand = toNumber(eoqData?.annualDemand)
  const ordering = toNumber(eoqData?.orderingCost || 50)
  const holding = toNumber(eoqData?.holdingCost || 1)
  const cantidades = eoq > 0
    ? Array.from({ length: 8 }, (_, index) => Math.max(1, Math.round(eoq * (0.4 + index * 0.2))))
    : [50, 100, 150, 200, 250, 300, 350, 400]
  const costoMantenimiento = cantidades.map((cantidad) => Number(((cantidad / 2) * holding).toFixed(2)))
  const costoPedido = cantidades.map((cantidad) => Number((((demand || 0) / Math.max(1, cantidad)) * ordering).toFixed(2)))
  const costoTotal = cantidades.map((cantidad, index) => Number((costoMantenimiento[index] + costoPedido[index]).toFixed(2)))

  return { cantidades, costoMantenimiento, costoPedido, costoTotal }
}

const lowRotationBuckets = (items = [], periodDays = 90) => {
  const buckets = [
    { label: '0-30 días', min: 0, max: 30, value: 0, capital: 0, color: '#12684e' },
    { label: '31-60 días', min: 31, max: 60, value: 0, capital: 0, color: '#4cbf93' },
    { label: '61-90 días', min: 61, max: 90, value: 0, capital: 0, color: '#dfa758' },
    { label: '91-180 días', min: 91, max: 180, value: 0, capital: 0, color: '#c08d42' },
    { label: '+180 días', min: 181, max: Infinity, value: 0, capital: 0, color: '#a93b32' },
  ]

  for (const item of items) {
    const turnover = toNumber(item.turnover)
    const daysOnHand = turnover > 0 ? periodDays / turnover : 999
    const stock = toNumber(item.stock)
    const capital = toNumber(item.capital)
    const bucket = buckets.find((entry) => daysOnHand >= entry.min && daysOnHand <= entry.max) || buckets[buckets.length - 1]
    bucket.value += 1
    bucket.capital += capital
    item.daysOnHand = daysOnHand
  }

  return buckets
}

export const emptyVentasDashboard = {
  kpis: { facturacionTotal: 0, ticketPromedio: 0, operaciones: 0, margenPromedio: 0 },
  evolucion: { xAxis: [], series: [{ data: [], label: 'Ventas (Millones $)' }] },
  formaPago: [],
  categorias: [],
  sucursales: [],
  empleados: [],
  pareto: { productos: [], ventasAbsolutas: [], porcentajeAcumulado: [] },
  elasticidad: [],
}

export const emptyComprasDashboard = {
  kpis: { gastoMensual: 0, proveedoresActivos: 0, cumplimientoPromedio: 0, alertasStock: 0 },
  evolucionCosto: { xAxis: [], series: [{ data: [], label: 'Costo Total (Miles $)' }] },
  precioProducto: { xAxis: [], series: [{ data: [], label: 'Precio Compra (U$S)' }] },
  proveedores: [],
  dispersionPrecios: [],
  abc: [],
  inventario: [],
  eoq: { cantidades: [], costoMantenimiento: [], costoPedido: [], costoTotal: [] },
}

export const emptyInventarioDashboard = {
  kpis: { totalArticulos: 0, capitalInmovilizado: 0, riesgoObsolescencia: 0, indiceRotacion: 0 },
  aging: { categorias: [], cantidades: [] },
  valorizacion: [],
}

export const emptyReparacionesDashboard = {
  kpis: { reparacionesTotales: 0, tiempoPromedio: 0, tasaExito: 0, margenGlobal: 0 },
  periodo: { xAxis: [], series: [{ data: [], label: 'Equipos Reparados' }] },
  dispositivos: [],
  marcas: [],
  dispositivoFalla: [],
  pareto: { fallas: [], absolutas: [], acumulado: [] },
  distribucionTiempo: { categorias: [], frecuencia: [] },
  tecnicos: [],
  matriz: [],
}

export const emptyControlDashboard = {
  kpis: { operacionesTotales: 0, anulaciones: 0, descuentosAplicados: 0, usuariosActivos: 0 },
  heatmap: [],
  evolucionRiesgo: { xAxis: [], series: [] },
}

export const emptyFinancieroDashboard = {
  kpis: { ingresosTotales: 0, egresosTotales: 0, flujoNeto: 0, margenPromedio: 0 },
  ingresosEgresos: { meses: [], ingresos: [], egresos: [] },
  margenProducto: [],
  margenCategoria: [],
  rentabilidadMarca: [],
}

export async function loadVentasDashboard(range = null) {
  const range30 = normalizeUiRange(range, 30)
  const range60 = normalizeUiRange(range, 60)
  const query30 = buildQuery(range30)
  const query60 = buildQuery(range60)
  const [summary, evolucion, formaPago, categoria, sucursal, pareto, elasticidad, empleados, historico, finanzas] = await Promise.all([
    fetchData('/dashboard/summary'),
    fetchData(`/dashboard/ventas/evolucion?${query30}`),
    fetchData(`/dashboard/ventas/forma-pago?${query30}`),
    fetchData(`/dashboard/ventas/categoria?${query30}`),
    fetchData(`/dashboard/ventas/sucursal?${query30}`),
    fetchData(`/dashboard/ventas/pareto?${query30}`),
    fetchData(`/dashboard/ventas/elasticidad?${query30}`),
    getEmpleados().catch(() => []),
    fetchData(`/ventas/historico?desde=${encodeURIComponent(range60.from)}&hasta=${encodeURIComponent(range60.to)}`).catch(() => []),
    fetchData(`/dashboard/finanzas/margen-bruto?${query60}`).catch(() => null),
  ])

  const ventasTotales = toNumber(pareto?.totalRevenue) || sum(evolucion?.series ?? [], (item) => item.total)
  const ventasCount = toNumber(summary?.ventas?.count) || (historico?.length ?? 0)
  const margenPct = toNumber(finanzas?.margenPct)

  const mapaEmpleados = new Map(
    (empleados ?? []).map((emp) => [String(emp.id ?? emp.Id), `${emp.nombre ?? emp.Nombre ?? ''} ${emp.apellido ?? emp.Apellido ?? ''}`.trim() || emp.nombre || emp.Nombre || `#${emp.id ?? emp.Id}`])
  )
  const agregados = new Map()
  for (const venta of historico ?? []) {
    const idEmpleado = String(venta.IdEmpleado ?? venta.idEmpleado ?? venta.empleado?.Id ?? '')
    const nombre = mapaEmpleados.get(idEmpleado) || `${venta.empleado?.Nombre ?? ''} ${venta.empleado?.Apellido ?? ''}`.trim() || `Empleado ${idEmpleado || '?'}`
    const actual = agregados.get(idEmpleado) || { nombre, ventas: 0, total: 0 }
    actual.ventas += 1
    actual.total += toNumber(venta.TotalVenta ?? venta.TotalVentaARS ?? venta.totalVenta ?? 0)
    agregados.set(idEmpleado, actual)
  }

  const rankingEmpleados = Array.from(agregados.values())
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 4)
    .map((item) => ({
      nombre: item.nombre,
      ventas: item.ventas,
      ticket: item.ventas > 0 ? Math.round(item.total / item.ventas) : 0,
    }))

  const elasticidadSeries = Array.isArray(elasticidad?.entries) ? elasticidad.entries : []
  const dispersionSeries = Array.isArray(elasticidadSeries) ? elasticidadSeries : []

  return {
    kpis: {
      facturacionTotal: Math.round(ventasTotales),
      ticketPromedio: ventasCount > 0 ? Math.round(ventasTotales / ventasCount) : 0,
      operaciones: ventasCount,
      margenPromedio: margenPct,
    },
    evolucion: {
      xAxis: (evolucion?.series ?? []).map((item) => item.period),
      series: [{ data: (evolucion?.series ?? []).map((item) => toNumber(item.total)), label: 'Ventas (Millones $)' }],
    },
    formaPago: (formaPago?.methods ?? []).map((item, index) => ({
      id: index,
      value: toNumber(item.total),
      label: item.method ?? item.metodo ?? `Método ${index + 1}`,
      color: colorByIndex(index, ['#12684e', '#4cbf93', '#dfa758', '#a39d93']),
    })),
    categorias: (categoria?.categories ?? []).map((item) => ({
      label: item.category ?? item.categoria ?? item.Nombre ?? 'Sin categoría',
      value: toNumber(item.total),
    })),
    sucursales: (sucursal?.branches ?? []).map((item) => ({
      nombre: item.sucursal ?? item.branch ?? item.Nombre ?? 'Sucursal',
      facturacion: toNumber(item.revenue),
      margen: toNumber(item.marginPct ?? item.margin),
    })),
    empleados: rankingEmpleados,
    pareto: {
      productos: (pareto?.entries ?? []).map((item) => item.product ?? item.producto ?? 'Producto'),
      ventasAbsolutas: (pareto?.entries ?? []).map((item) => toNumber(item.total)),
      porcentajeAcumulado: (pareto?.entries ?? []).map((item) => toNumber(item.cumulativePercentage)),
    },
    elasticidad: dispersionSeries.map((item, index) => ({
      x: toNumber(item.baseAvgPrice ?? item.compareAvgPrice ?? item.avgPrice),
      y: toNumber(item.baseQty ?? item.compareQty ?? item.quantity),
      id: item.id ?? index,
    })),
    mockEvolucion: {
      xAxis: (evolucion?.series ?? []).map((item) => item.period),
      series: [{ data: (evolucion?.series ?? []).map((item) => toNumber(item.total)), label: 'Ventas (Millones $)' }],
    },
    formaPago: (formaPago?.methods ?? []).map((item, index) => ({
      id: index,
      value: toNumber(item.total),
      label: item.method ?? item.metodo ?? `Método ${index + 1}`,
      color: colorByIndex(index, ['#12684e', '#4cbf93', '#dfa758', '#a39d93']),
    })),
    categorias: (categoria?.categories ?? []).map((item) => ({
      label: item.category ?? item.categoria ?? item.Nombre ?? 'Sin categoría',
      value: toNumber(item.total),
    })),
    sucursales: (sucursal?.branches ?? []).map((item) => ({
      nombre: item.sucursal ?? item.branch ?? item.Nombre ?? 'Sucursal',
      facturacion: toNumber(item.revenue),
      margen: toNumber(item.marginPct ?? item.margin),
    })),
    empleados: rankingEmpleados,
    pareto: {
      productos: (pareto?.entries ?? []).map((item) => item.product ?? item.producto ?? 'Producto'),
      ventasAbsolutas: (pareto?.entries ?? []).map((item) => toNumber(item.total)),
      porcentajeAcumulado: (pareto?.entries ?? []).map((item) => toNumber(item.cumulativePercentage)),
    },
    elasticidad: dispersionSeries.map((item, index) => ({
      x: toNumber(item.baseAvgPrice ?? item.compareAvgPrice ?? item.avgPrice),
      y: toNumber(item.baseQty ?? item.compareQty ?? item.quantity),
      id: item.id ?? index,
    })),
  }
}

export async function loadComprasDashboard(range = null) {
  const range30 = normalizeUiRange(range, 30)
  const range90 = normalizeUiRange(range, 90)
  const range180 = normalizeUiRange(range, 180)
  const query30 = buildQuery(range30)
  const query90 = buildQuery(range90)
  const query180 = buildQuery(range180)
  const [evolucionCosto, rankingProveedores, abc, variacionPrecio, bajaRotacion] = await Promise.all([
    fetchData(`/dashboard/compras/evolucion-costo?${query30}`),
    fetchData(`/dashboard/compras/ranking-proveedores?${query30}`),
    fetchData(`/dashboard/compras/abc?${query180}`),
    fetchData(`/dashboard/compras/variacion-precio-proveedor?${query180}`),
    fetchData(`/dashboard/inventario/baja-rotacion?days=90`),
  ])

  const topProductId = abc?.entries?.[0]?.id ?? bajaRotacion?.entries?.[0]?.idProducto ?? bajaRotacion?.entries?.[0]?.id ?? null
  const [evolucionPrecio, eoq, puntoReposicion, stockSeguridad] = topProductId
    ? await Promise.all([
      fetchData(`/dashboard/compras/evolucion-precio?${buildQuery({ ...range180, productoId: topProductId, granularity: 'month' })}`),
      fetchData(`/dashboard/compras/eoq?${buildQuery({ productoId: topProductId })}`),
      fetchData(`/dashboard/compras/punto-reposicion?${buildQuery({ productoId: topProductId })}`),
      fetchData(`/dashboard/compras/stock-seguridad?${buildQuery({ productoId: topProductId })}`),
    ])
    : [null, null, null, null]

  const topRotationItems = (bajaRotacion?.entries ?? []).slice(0, 4)
  const focoInventario = await Promise.all(topRotationItems.map(async (item) => {
    const idProducto = item.idProducto ?? item.IdProducto ?? item.id ?? item.Id
    const [punto, seguridad] = await Promise.all([
      fetchData(`/dashboard/compras/punto-reposicion?${buildQuery({ productoId: idProducto })}`).catch(() => null),
      fetchData(`/dashboard/compras/stock-seguridad?${buildQuery({ productoId: idProducto })}`).catch(() => null),
    ])
    return {
      producto: item.producto ?? item.Producto ?? `Producto ${idProducto}`,
      stockActual: toNumber(item.stock),
      puntoReposicion: toNumber(punto?.reorderPoint ?? punto?.puntoReposicion ?? 0),
      stockSeguridad: toNumber(seguridad?.safetyStock ?? seguridad?.stockSeguridad ?? 0),
      idProducto,
    }
  }))

  const totalGasto = sum(evolucionCosto?.series ?? [], (item) => item.totalCosto)
  const proveedorEntries = rankingProveedores?.entries ?? []
  const maxFrecuencia = Math.max(...proveedorEntries.map((item) => toNumber(item.frecuencia)), 1)
  const cumplimientoPromedio = proveedorEntries.length
    ? Math.round(proveedorEntries.reduce((sumValue, item) => sumValue + (toNumber(item.frecuencia) / maxFrecuencia) * 100, 0) / proveedorEntries.length)
    : 0
  const alertasStock = focoInventario.filter((item) => item.stockActual <= item.puntoReposicion || item.stockActual <= item.stockSeguridad).length

  const classTotals = { A: 0, B: 0, C: 0 }
  const abcEntries = abc?.entries ?? []
  for (const item of abcEntries) classTotals[item.class ?? 'C'] += toNumber(item.total)
  const totalAbc = Object.values(classTotals).reduce((acc, value) => acc + value, 0) || 1

  const dispersion = (variacionPrecio?.data ?? []).flatMap((provider, providerIndex) =>
    (provider.prices ?? []).map((price, priceIndex) => ({
      x: providerIndex + 1,
      y: toNumber(price),
      id: `${provider.id ?? provider.proveedor ?? providerIndex}-${priceIndex}`,
    }))
  )

  return {
    kpis: {
      gastoMensual: Math.round(totalGasto),
      proveedoresActivos: proveedorEntries.length,
      cumplimientoPromedio,
      alertasStock,
    },
    evolucionCosto: {
      xAxis: (evolucionCosto?.series ?? []).map((item) => item.period),
      series: [{ data: (evolucionCosto?.series ?? []).map((item) => toNumber(item.totalCosto)), label: 'Costo Total (Miles $)' }],
    },
    precioProducto: {
      xAxis: (evolucionPrecio?.series ?? []).map((item) => item.period),
      series: [{ data: (evolucionPrecio?.series ?? []).map((item) => toNumber(item.avgPrecio)), label: 'Precio Compra (U$S)' }],
    },
    proveedores: proveedorEntries.slice(0, 5).map((item) => ({
      nombre: item.proveedor ?? item.Nombre ?? `Proveedor ${item.IdProveedor ?? ''}`.trim(),
      monto: toNumber(item.monto ?? item.totalComprado),
      cumplimiento: Math.round((toNumber(item.frecuencia) / maxFrecuencia) * 100),
    })),
    dispersionPrecios: dispersion,
    abc: [
      { id: 0, value: Math.round((classTotals.A / totalAbc) * 100), label: 'Clase A (Críticos)', color: '#a93b32' },
      { id: 1, value: Math.round((classTotals.B / totalAbc) * 100), label: 'Clase B (Medios)', color: '#dfa758' },
      { id: 2, value: Math.round((classTotals.C / totalAbc) * 100), label: 'Clase C (Bajos)', color: '#4cbf93' },
    ],
    inventario: focoInventario,
    eoq: buildEOQCurve(eoq),
  }
}

export async function loadInventarioDashboard(range = null) {
  const [summary, bajaRotacion, inventarios, precios, listas] = await Promise.all([
    fetchData('/dashboard/summary'),
    fetchData(`/dashboard/inventario/baja-rotacion?${buildQuery(normalizeUiRange(range, 90))}`),
    fetchData('/inventario/inventarios').catch(() => []),
    preciosService.getPreciosArticulos().catch(() => []),
    preciosService.getListas().catch(() => []),
  ])

  const items = bajaRotacion?.entries ?? []
  const priceMap = mapVigentePorInventario(precios)
  const mayoristas = idsListasMayoristas(listas)
  const normalized = items.map((item) => {
    const idInventario = item.idInventario ?? item.IdInventario ?? item.id ?? item.Id
    const vigente = resolverPrecioInventario(priceMap, idInventario, mayoristas)
    const costo = vigente.costoReal || vigente.costoBase || vigente.minorista || vigente.mayorista || 0
    const stock = toNumber(item.stock)
    const sold = toNumber(item.sold)
    const turnover = toNumber(item.turnover)
    const capital = stock * costo
    const daysOnHand = turnover > 0 ? 90 / turnover : 999
    return {
      idInventario,
      idProducto: item.idProducto ?? item.IdProducto ?? null,
      producto: item.producto ?? item.Producto ?? `Inventario ${idInventario}`,
      stock,
      sold,
      turnover,
      capital,
      daysOnHand,
    }
  })

  const buckets = lowRotationBuckets(normalized, 90)
  const totalStock = normalized.reduce((acc, item) => acc + item.stock, 0)
  const totalSold = normalized.reduce((acc, item) => acc + item.sold, 0)
  const capitalTotal = normalized.reduce((acc, item) => acc + item.capital, 0)
  const riskCount = normalized.filter((item) => item.daysOnHand >= 90).length
  const rotationIndex = totalStock > 0 ? Number(((totalSold / totalStock) * (365 / 90)).toFixed(2)) : 0

  return {
    kpis: {
      totalArticulos: toNumber(summary?.inventario?.count) || (inventarios?.length ?? normalized.length),
      capitalInmovilizado: Math.round(capitalTotal),
      riesgoObsolescencia: riskCount,
      indiceRotacion: rotationIndex,
    },
    aging: {
      categorias: buckets.map((bucket) => bucket.label),
      cantidades: buckets.map((bucket) => bucket.value),
    },
    valorizacion: buckets.map((bucket, index) => ({
      id: index,
      value: Math.round(bucket.capital),
      label: bucket.label,
      color: bucket.color,
    })),
  }
}

export async function loadReparacionesDashboard(range = null) {
  const range30 = normalizeUiRange(range, 30)
  const query30 = buildQuery(range30)
  const [evolucion, tipo, marca, pareto, tiempos, rentabilidad, ordenes] = await Promise.all([
    fetchData(`/dashboard/reparaciones/evolucion?${query30}`),
    fetchData(`/dashboard/reparaciones/tipo?${query30}`),
    fetchData(`/dashboard/reparaciones/marca?${query30}`),
    fetchData(`/dashboard/reparaciones/pareto-fallas?${query30}`),
    fetchData(`/dashboard/reparaciones/tiempos?${query30}`),
    fetchData(`/dashboard/reparaciones/rentabilidad?${query30}`),
    getOrdenes().catch(() => []),
  ])

  const delivered = (ordenes ?? []).filter((orden) => {
    const estado = String(orden.Estado ?? '').toLowerCase()
    return estado.includes('entreg') || Boolean(orden.FechaEntrega)
  })
  const avgDays = delivered.length
    ? delivered.reduce((acc, orden) => {
      if (!orden.FechaEmision || !orden.FechaEntrega) return acc
      return acc + Math.max(0, (new Date(orden.FechaEntrega) - new Date(orden.FechaEmision)) / 86400000)
    }, 0) / delivered.length
    : toNumber(tiempos?.mean)
  const successRate = (ordenes?.length ?? 0) > 0 ? Number(((delivered.length / ordenes.length) * 100).toFixed(1)) : 0
  const avgMargin = rentabilidad?.entries?.length
    ? Number((rentabilidad.entries.reduce((acc, item) => acc + toNumber(item.marginPct), 0) / rentabilidad.entries.length).toFixed(2))
    : 0

  const paretoEntries = pareto?.entries ?? []
  const matriz = repairDemandProfitMatrix(paretoEntries)
  const dispositivoFalla = deviceFailureMatrix(ordenes)
  const tecnicos = technicianPerformance(ordenes)

  return {
    kpis: {
      reparacionesTotales: (ordenes ?? []).length || toNumber(evolucion?.series?.reduce((acc, item) => acc + toNumber(item.repairs), 0)),
      tiempoPromedio: Number((avgDays || 0).toFixed(2)),
      tasaExito: successRate,
      margenGlobal: avgMargin,
    },
    periodo: {
      xAxis: (evolucion?.series ?? []).map((item) => item.period),
      series: [{ data: (evolucion?.series ?? []).map((item) => toNumber(item.repairs)), label: 'Equipos Reparados' }],
    },
    dispositivos: (tipo?.categories ?? []).map((item) => ({
      label: item.categoria ?? item.category ?? item.Nombre ?? 'Dispositivo',
      value: toNumber(item.repairs),
    })),
    marcas: (marca?.marcas ?? []).map((item) => ({
      label: item.marca ?? item.Nombre ?? 'Marca',
      value: toNumber(item.repairs),
    })),
    dispositivoFalla,
    pareto: {
      fallas: paretoEntries.map((item) => item.falla ?? item.product ?? 'Falla'),
      absolutas: paretoEntries.map((item) => toNumber(item.count)),
      acumulado: paretoEntries.map((item) => toNumber(item.cumulative ?? item.cumulativePercentage)),
    },
    distribucionTiempo: {
      categorias: (tiempos?.histogram ?? []).map((item) => item.range),
      frecuencia: (tiempos?.histogram ?? []).map((item) => toNumber(item.count)),
    },
    tecnicos,
    matriz,
  }
}

export async function loadControlDashboard(range = null) {
  const current = await fetchData(`/dashboard/control/empleado-operacion?${buildQuery(normalizeUiRange(range, 30))}`).catch(() => null)
  const { rows, totals } = controlTotals(current)
  const trend = await buildControlTrendFromRange(range)

  return {
    kpis: {
      operacionesTotales: totals.Ventas + totals.Compras + totals.Anulaciones + totals.Descuentos,
      anulaciones: totals.Anulaciones,
      descuentosAplicados: totals.Descuentos,
      usuariosActivos: rows.length,
    },
    heatmap: rows,
    evolucionRiesgo: trend,
    mockHeatmap: rows,
    evolucionRiesgo: trend,
  }
}

export async function loadFinancieroDashboard(range = null) {
  const range180 = normalizeUiRange(range, 30)
  const query180 = buildQuery(range180)
  const [flow, marginBruto, marginProd, marginCat, rentMarca] = await Promise.all([
    fetchData(`/dashboard/finanzas/ingresos-egresos?${query180}`),
    fetchData(`/dashboard/finanzas/margen-bruto?${query180}`),
    fetchData(`/dashboard/finanzas/margen-producto?${query180}`),
    fetchData(`/dashboard/finanzas/margen-categoria?${query180}`),
    fetchData(`/dashboard/finanzas/rentabilidad-marca?${query180}`),
  ])

  const ingresos = (flow?.series ?? []).map((item) => toNumber(item.ingresos))
  const egresos = (flow?.series ?? []).map((item) => toNumber(item.egresos))
  const ingresosTotales = toNumber(marginBruto?.totalVentas) || sum(flow?.series ?? [], (item) => item.ingresos)
  const egresosTotales = toNumber(marginBruto?.totalCostos) || sum(flow?.series ?? [], (item) => item.egresos)
  const flujoNeto = ingresosTotales - egresosTotales

  return {
    kpis: {
      ingresosTotales: Math.round(ingresosTotales),
      egresosTotales: Math.round(egresosTotales),
      flujoNeto: Math.round(flujoNeto),
      margenPromedio: toNumber(marginBruto?.margenPct),
    },
    ingresosEgresos: {
      meses: (flow?.series ?? []).map((item) => item.period),
      ingresos,
      egresos,
    },
    margenProducto: (marginProd?.entries ?? []).map((item) => ({
      nombre: item.producto ?? item.product ?? 'Producto',
      ventas: toNumber(item.revenue),
      margen: toNumber(item.marginPct),
    })),
    margenCategoria: (marginCat?.entries ?? []).map((item) => ({
      categoria: item.categoria ?? item.category ?? 'Categoría',
      costo: toNumber(item.cost),
      margenNeto: toNumber(item.margin),
    })),
    rentabilidadMarca: (rentMarca?.entries ?? []).map((item) => ({
      marca: item.marca ?? item.brand ?? 'Marca',
      rentabilidad: toNumber(item.margin),
    })),
  }
}

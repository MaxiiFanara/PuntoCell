export const DEFAULT_LIMIT = 20

export const toNumber = (value) => Number(value) || 0

export const parseDate = (value, fallback = null) => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export const normalizeRange = (query = {}, fallbackDays = 30) => {
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

export const resolveIdSucursal = (query = {}) => {
  const raw = query.idSucursal ?? query.IdSucursal ?? query.sucursalId ?? query.sucursal
  if (raw === undefined || raw === null || raw === '') return null
  const branchId = Number(raw)
  return Number.isFinite(branchId) && branchId > 0 ? branchId : null
}

export const resolveProductId = (query = {}) => {
  const raw = query.productId ?? query.productoId ?? query.IdArticulo ?? query.idArticulo ?? query.articuloId
  if (raw === undefined || raw === null || raw === '') return null
  const productId = Number(raw)
  return Number.isFinite(productId) && productId > 0 ? productId : null
}

const pad = (value) => String(value).padStart(2, '0')

export const periodKey = (value, groupBy = 'day') => {
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

export const plain = (item) => (item?.get ? item.get({ plain: true }) : item)
export const plainList = (items = []) => items.map(plain)

export const sortDesc = (rows, limit = null) => {
  const sorted = [...rows].sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0) || (b.totalCount ?? 0) - (a.totalCount ?? 0))
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

export const matchText = (value, filterValue) => {
  if (!filterValue) return true
  return String(value ?? '').toLowerCase().includes(String(filterValue).toLowerCase())
}

export const getProductoMeta = (inventario) => {
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

export const includesForProducto = (models) => ([
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
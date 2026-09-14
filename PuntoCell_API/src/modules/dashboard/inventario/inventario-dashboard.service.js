import { Op } from 'sequelize'
import { auditar } from '../../../core/utils/audit.util.js'
import { models } from '../../../models/index.js'
import { includesForProducto, normalizeRange, plainList, toNumber } from '../dashboard.utils.js'

const rangeToWhere = (field, from, to) => ({ [field]: { [Op.between]: [from, to] } })

export default class InventarioDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService }

  _resolveRange(query = {}, defaultDays = 90) {
    return normalizeRange(query, defaultDays)
  }

  async getProductosBajaRotacion(query = {}, ctx = null) {
    const days = Number(query.days) || 90
    const { from, to } = this._resolveRange(query, days)
    const inventarios = plainList(await models.Inventario.findAll({
      include: [
        { model: models.Sucursal, as: 'sucursal', attributes: ['Id', 'Nombre'], required: false },
        { model: models.Articulo, as: 'articulo', attributes: ['Id', 'Nombre', 'IdModeloArticulo'], required: false, include: [{ model: models.ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'], required: false, include: [{ model: models.MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'], required: false }, { model: models.CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'], required: false }] }] },
      ],
      order: [['Stock', 'ASC']]
    }))

    const movimientos = plainList(await models.DetalleVenta.findAll({
      attributes: ['Id', 'IdArticulo', 'Cantidad'],
      include: [{ model: models.Venta, as: 'venta', attributes: ['Id', 'Fecha'], required: true }],
      order: [['Id', 'ASC']],
      limit: 5000
    }))

    const soldByInventory = new Map()
    for (const detalle of movimientos) {
      const fecha = detalle.venta?.Fecha
      if (!fecha) continue
      const saleDate = new Date(fecha)
      if (saleDate < from || saleDate > to) continue
      const key = detalle.IdArticulo ?? null
      if (key === null) continue
      soldByInventory.set(key, (soldByInventory.get(key) || 0) + toNumber(detalle.Cantidad))
    }

    const entries = inventarios.map((inventario) => {
      const sold = soldByInventory.get(inventario.Id) || 0
      const stock = toNumber(inventario.Stock)
      const turnover = stock > 0 ? Number((sold / stock).toFixed(6)) : null
      return { idInventario: inventario.Id, idProducto: inventario.IdArticulo, producto: inventario.articulo?.Nombre ?? `Producto ${inventario.IdArticulo}`, stock, sold, turnover }
    }).sort((a, b) => {
      const aScore = a.turnover === null ? Number.POSITIVE_INFINITY : a.turnover
      const bScore = b.turnover === null ? Number.POSITIVE_INFINITY : b.turnover
      return aScore - bScore
    })

    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó productos baja rotación', `days=${days}`)
    return { periodDays: days, entries }
  }
}

import { auditar } from '../../../core/utils/audit.util.js';
import { sequelize } from '../../../models/index.js';
import { QueryTypes } from 'sequelize';

function formatISO(d){ if(!d) return null; const z=new Date(d); return z.toISOString().slice(0,19).replace('T',' '); }

export default class InventarioDashboardService {
  constructor(bitacoraService = null){ this.bitacoraService = bitacoraService; }

  _resolveRange(query = {}, defaultDays = 90) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) { const f = new Date(to); f.setDate(f.getDate() - defaultDays); from = f; }
    return { from, to };
  }

  async getProductosBajaRotacion(query = {}, ctx = null){
    const days = Number(query.days) || 90;
    const { from, to } = this._resolveRange(query, days);
    const sql = `SELECT i.Id AS IdInventario, p.Id AS IdProducto, p.Nombre AS producto, i.Stock AS stock, ISNULL(SUM(CONVERT(float, dv.Cantidad)),0) AS sold FROM Inventario i LEFT JOIN DetalleVenta dv ON dv.IdInventario = i.Id LEFT JOIN Venta v ON dv.IdVenta = v.Id AND v.Fecha >= :from AND v.Fecha <= :to INNER JOIN Producto p ON i.IdProducto = p.Id GROUP BY i.Id, p.Id, p.Nombre, i.Stock ORDER BY CASE WHEN i.Stock>0 THEN (ISNULL(SUM(CONVERT(float, dv.Cantidad)),0)/i.Stock) ELSE 999999 END ASC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mapped = rows.map(r=>{ const sold = Number(r.sold||0); const stock = Number(r.stock||0); const turnover = stock>0? Number((sold/stock).toFixed(6)) : null; return { idInventario: r.IdInventario, idProducto: r.IdProducto, producto: r.producto, stock, sold, turnover }; });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó productos baja rotación', `days=${days}`);
    return { periodDays: days, entries: mapped };
  }
}

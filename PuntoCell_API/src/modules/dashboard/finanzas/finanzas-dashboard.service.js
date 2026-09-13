import { auditar } from '../../../core/utils/audit.util.js';
import { sequelize } from '../../../models/index.js';
import { QueryTypes } from 'sequelize';

function formatISO(d){ if(!d) return null; const z=new Date(d); return z.toISOString().slice(0,19).replace('T',' '); }

export default class FinanzasDashboardService {
  constructor(bitacoraService = null){ this.bitacoraService = bitacoraService; }

  _resolveRange(query = {}, defaultMonths = 2) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) { const f = new Date(to); f.setMonth(f.getMonth() - defaultMonths); from = f; }
    return { from, to };
  }

  async getIngresosEgresos(query = {}, ctx = null){
    const gran = query.granularity || 'month';
    const { from, to } = this._resolveRange(query, 5);
    const periodExpr = gran === 'month' ? "CONVERT(char(7), Fecha, 120)" : "CONVERT(char(10), Fecha, 23)";
    const sql = `SELECT ${periodExpr} AS period, SUM(CASE WHEN TipoMovimiento = 1 THEN CONVERT(float, Monto) ELSE 0 END) AS ingresos, SUM(CASE WHEN TipoMovimiento = 0 THEN CONVERT(float, Monto) ELSE 0 END) AS egresos FROM MovimientoCaja WHERE Fecha >= :from AND Fecha <= :to GROUP BY ${periodExpr} ORDER BY period`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ingresos vs egresos', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series: rows };
  }

  async getMargenBruto(query = {}, ctx = null){
    const { from, to } = this._resolveRange(query, 2);
    const sql = `SELECT SUM(CONVERT(float, TotalVenta)) AS totalVentas, SUM(CONVERT(float, TotalCosto)) AS totalCostos FROM Venta WHERE Fecha >= :from AND Fecha <= :to`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const totalVentas = Number(rows[0]?.totalVentas||0); const totalCostos = Number(rows[0]?.totalCostos||0); const margen = totalVentas - totalCostos; const margenPct = totalVentas>0? Number(((margen/totalVentas)*100).toFixed(2)) : 0;
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen bruto', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, totalVentas, totalCostos, margen: Number(margen.toFixed(2)), margenPct };
  }

  async getMargenPorProducto(query = {}, ctx = null){
    const { from, to } = this._resolveRange(query, 2);
    const sql = `WITH detalle_agg AS (
        SELECT dv.IdInventario,
          SUM(CONVERT(float, dv.Cantidad)) AS qty,
          SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS revenue
        FROM DetalleVenta dv
        INNER JOIN Venta v ON dv.IdVenta = v.Id
        WHERE v.Fecha >= :from AND v.Fecha <= :to
        GROUP BY dv.IdInventario
      )
      SELECT p.Id AS IdProducto, p.Nombre AS producto, SUM(da.revenue) AS revenue, SUM(da.qty * ISNULL(pa.CostoReal,0)) AS cost
      FROM detalle_agg da
      INNER JOIN Inventario i ON da.IdInventario = i.Id
      INNER JOIN Producto p ON i.IdProducto = p.Id
      LEFT JOIN PrecioArticulo pa ON pa.IdInventario = i.Id AND pa.FechaHasta IS NULL
      GROUP BY p.Id, p.Nombre
      ORDER BY revenue DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mapped = rows.map(r=>{ const revenue = Number(r.revenue||0); const cost = Number(r.cost||0); const margin = revenue - cost; const marginPct = revenue>0? Number(((margin/revenue)*100).toFixed(2)):0; return { id: r.IdProducto, producto: r.producto, revenue: Number(revenue.toFixed(2)), cost: Number(cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }; });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen por producto', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries: mapped };
  }

  async getMargenPorCategoria(query = {}, ctx = null){
    const { from, to } = this._resolveRange(query, 2);
    const sql = `WITH detalle_agg AS (
        SELECT dv.IdInventario,
          SUM(CONVERT(float, dv.Cantidad)) AS qty,
          SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS revenue
        FROM DetalleVenta dv
        INNER JOIN Venta v ON dv.IdVenta = v.Id
        WHERE v.Fecha >= :from AND v.Fecha <= :to
        GROUP BY dv.IdInventario
      )
      SELECT cat.Id AS IdCategoria, cat.Nombre AS categoria, SUM(da.revenue) AS revenue, SUM(da.qty * ISNULL(pa.CostoReal,0)) AS cost
      FROM detalle_agg da
      INNER JOIN Inventario i ON da.IdInventario = i.Id
      INNER JOIN Producto p ON i.IdProducto = p.Id
      INNER JOIN ModeloProducto m ON p.IdModeloProducto = m.Id
      INNER JOIN CategoriaProducto cat ON m.IdCategoriaProducto = cat.Id
      LEFT JOIN PrecioArticulo pa ON pa.IdInventario = i.Id AND pa.FechaHasta IS NULL
      GROUP BY cat.Id, cat.Nombre
      ORDER BY revenue DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mapped = rows.map(r=>{ const revenue = Number(r.revenue||0); const cost = Number(r.cost||0); const margin = revenue - cost; const marginPct = revenue>0? Number(((margin/revenue)*100).toFixed(2)):0; return { id: r.IdCategoria, categoria: r.categoria, revenue: Number(revenue.toFixed(2)), cost: Number(cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }; });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó margen por categoría', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries: mapped };
  }

  async getRentabilidadPorMarca(query = {}, ctx = null){
    const { from, to } = this._resolveRange(query, 5);
    const sql = `WITH detalle_agg AS (
        SELECT dv.IdInventario,
          SUM(CONVERT(float, dv.Cantidad)) AS qty,
          SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS revenue
        FROM DetalleVenta dv
        INNER JOIN Venta v ON dv.IdVenta = v.Id
        WHERE v.Fecha >= :from AND v.Fecha <= :to
        GROUP BY dv.IdInventario
      )
      SELECT ma.Id AS IdMarca, ma.Nombre AS marca, SUM(da.revenue) AS revenue, SUM(da.qty * ISNULL(pa.CostoReal,0)) AS cost
      FROM detalle_agg da
      INNER JOIN Inventario i ON da.IdInventario = i.Id
      INNER JOIN Producto p ON i.IdProducto = p.Id
      INNER JOIN ModeloProducto m ON p.IdModeloProducto = m.Id
      INNER JOIN MarcaProducto ma ON m.IdMarcaProducto = ma.Id
      LEFT JOIN PrecioArticulo pa ON pa.IdInventario = i.Id AND pa.FechaHasta IS NULL
      GROUP BY ma.Id, ma.Nombre
      ORDER BY (SUM(da.revenue) - SUM(da.qty * ISNULL(pa.CostoReal,0))) DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mapped = rows.map(r=>{ const revenue = Number(r.revenue||0); const cost = Number(r.cost||0); const margin = revenue - cost; const marginPct = revenue>0? Number(((margin/revenue)*100).toFixed(2)):0; return { id: r.IdMarca, marca: r.marca, revenue: Number(revenue.toFixed(2)), cost: Number(cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }; });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó rentabilidad por marca', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries: mapped };
  }

}

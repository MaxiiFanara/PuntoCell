import { auditar } from '../../../core/utils/audit.util.js';
import { sequelize } from '../../../models/index.js';
import { QueryTypes } from 'sequelize';

const VALID_GRAN = ['day','week','month','year'];
function formatISO(d){ if(!d) return null; const z=new Date(d); return z.toISOString().slice(0,19).replace('T',' '); }
function buildPeriodExpr(gran){ switch(gran){ case 'month': return "CONVERT(char(7), FechaEmision, 120)"; case 'year': return "CAST(YEAR(FechaEmision) AS VARCHAR(4))"; case 'week': return "CONCAT(YEAR(FechaEmision), '-', RIGHT('00'+CAST(DATEPART(iso_week,FechaEmision) AS VARCHAR(2)),2))"; case 'day': default: return "CONVERT(char(10), FechaEmision, 23)"; } }

export default class ReparacionesDashboardService {
  constructor(bitacoraService=null){ this.bitacoraService = bitacoraService; }

  _resolveRange(query = {}, defaultDays = 29) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) { const f = new Date(to); f.setDate(f.getDate() - defaultDays); from = f; }
    return { from, to };
  }

  async getReparacionesEvolucion(query={}, ctx=null){
    const gran = VALID_GRAN.includes((query.granularity||'').toLowerCase())?query.granularity.toLowerCase():'day';
    const { from, to } = this._resolveRange(query, 29);
    const periodExpr = buildPeriodExpr(gran);
    const sql = `SELECT ${periodExpr} AS period, COUNT(*) AS repairs FROM OrdenReparacion WHERE FechaEmision >= :from AND FechaEmision <= :to GROUP BY ${periodExpr} ORDER BY period`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por período', `gran=${gran}`);
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series: rows };
  }

  async getReparacionesPorTipo(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 29);
    const sql = `SELECT cat.Id AS IdCategoria, cat.Nombre AS categoria, COUNT(*) AS repairs FROM OrdenReparacion o INNER JOIN DispositivoCliente dc ON o.IdDispositivoCliente = dc.Id INNER JOIN ModeloProducto m ON dc.IdModeloProducto = m.Id INNER JOIN CategoriaProducto cat ON m.IdCategoriaProducto = cat.Id WHERE o.FechaEmision >= :from AND o.FechaEmision <= :to GROUP BY cat.Id, cat.Nombre ORDER BY repairs DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por tipo', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, categories: rows };
  }

  async getReparacionesPorMarca(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 29);
    const sql = `SELECT ma.Id AS IdMarca, ma.Nombre AS marca, COUNT(*) AS repairs FROM OrdenReparacion o INNER JOIN DispositivoCliente dc ON o.IdDispositivoCliente = dc.Id INNER JOIN ModeloProducto m ON dc.IdModeloProducto = m.Id INNER JOIN MarcaProducto ma ON m.IdMarcaProducto = ma.Id WHERE o.FechaEmision >= :from AND o.FechaEmision <= :to GROUP BY ma.Id, ma.Nombre ORDER BY repairs DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó reparaciones por marca', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, marcas: rows };
  }

  async getRepuestosUsados(query={}, ctx=null){
    const limit = Math.max(1, Math.min(Number(query.limit) || 5, 50));
    const { from, to } = this._resolveRange(query, 29);
    const sql = `
      SELECT TOP (${limit})
        a.Id AS IdArticulo,
        a.Nombre AS Repuesto,
        SUM(CONVERT(float, ro.Cantidad)) AS CantidadUsada
      FROM RepuestoOrden ro
      INNER JOIN Inventario i ON ro.IdInventario = i.Id
      INNER JOIN Producto a ON i.IdProducto = a.Id
      WHERE a.EsRepuesto = 1
      AND ro.IdOrdenReparacion IN (
        SELECT Id FROM OrdenReparacion WHERE FechaEmision >= :from AND FechaEmision <= :to
      )
      GROUP BY a.Id, a.Nombre
      ORDER BY CantidadUsada DESC, Repuesto ASC
    `;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó repuestos más usados', `limit=${limit}`);
    return { entries: rows.map(r => ({
      IdArticulo: r.IdArticulo,
      Repuesto: r.Repuesto,
      CantidadUsada: Number(r.CantidadUsada || 0),
    })) };
  }

  async getHeatmapMarcaFalla(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 89);
    const sql = `SELECT ma.Nombre AS marca, f.Nombre AS falla, COUNT(*) AS count FROM OrdenReparacion o INNER JOIN OrdenFalla ofa ON ofa.IdOrdenReparacion = o.Id INNER JOIN Falla f ON ofa.IdFalla = f.Id INNER JOIN DispositivoCliente dc ON o.IdDispositivoCliente = dc.Id INNER JOIN ModeloProducto m ON dc.IdModeloProducto = m.Id INNER JOIN MarcaProducto ma ON m.IdMarcaProducto = ma.Id WHERE o.FechaEmision >= :from AND o.FechaEmision <= :to GROUP BY ma.Nombre, f.Nombre ORDER BY ma.Nombre, count DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const map = new Map(); const fallasSet = new Set(); const marcasSet = new Set();
    for(const r of rows){ marcasSet.add(r.marca); fallasSet.add(r.falla); const key = r.marca; if(!map.has(key)) map.set(key,{}); map.get(key)[r.falla] = Number(r.count||0); }
    const marcas = Array.from(marcasSet); const fallas = Array.from(fallasSet);
    const matrix = marcas.map(m=>({ marca: m, counts: fallas.map(f=> map.get(m)?.[f]||0) }));
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó heatmap marca×falla', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, marcas, fallas, matrix };
  }

  async getParetoFallas(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 89);
    const sql = `SELECT f.Id AS IdFalla, f.Nombre AS falla, COUNT(*) AS cnt FROM OrdenReparacion o INNER JOIN OrdenFalla ofa ON ofa.IdOrdenReparacion = o.Id INNER JOIN Falla f ON ofa.IdFalla = f.Id WHERE o.FechaEmision >= :from AND o.FechaEmision <= :to GROUP BY f.Id, f.Nombre ORDER BY cnt DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const total = rows.reduce((s,r)=>s+Number(r.cnt||0),0);
    let cumulative=0; const entries=[]; for(let i=0;i<rows.length;i++){ const r=rows[i]; const pct = total>0? (Number(r.cnt||0)/total)*100:0; cumulative+=pct; entries.push({ rank: i+1, id: r.IdFalla, falla: r.falla, count: Number(r.cnt||0), percentage: Number(pct.toFixed(2)), cumulative: Number(cumulative.toFixed(2)) }); }
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó pareto de fallas', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, total, entries };
  }

  async getTiemposReparacion(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 90);
    const sql = `SELECT
        COUNT(*) AS count,
        AVG(CONVERT(float, DATEDIFF(day, FechaEmision, FechaEntrega))) AS mean,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 0 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 1 THEN 1 ELSE 0 END) AS bucket_0_0,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 1 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 3 THEN 1 ELSE 0 END) AS bucket_1_2,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 3 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 7 THEN 1 ELSE 0 END) AS bucket_3_6,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 7 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 14 THEN 1 ELSE 0 END) AS bucket_7_13,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 14 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 30 THEN 1 ELSE 0 END) AS bucket_14_29,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 30 AND DATEDIFF(day, FechaEmision, FechaEntrega) < 90 THEN 1 ELSE 0 END) AS bucket_30_89,
        SUM(CASE WHEN DATEDIFF(day, FechaEmision, FechaEntrega) >= 90 THEN 1 ELSE 0 END) AS bucket_90_plus
      FROM OrdenReparacion
      WHERE FechaEntrega IS NOT NULL AND FechaEmision >= :from AND FechaEmision <= :to`;
    const [row] = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mean = Number(row?.mean || 0);
    const hist = [
      { range: '0-0', count: Number(row?.bucket_0_0 || 0) },
      { range: '1-2', count: Number(row?.bucket_1_2 || 0) },
      { range: '3-6', count: Number(row?.bucket_3_6 || 0) },
      { range: '7-13', count: Number(row?.bucket_7_13 || 0) },
      { range: '14-29', count: Number(row?.bucket_14_29 || 0) },
      { range: '30-89', count: Number(row?.bucket_30_89 || 0) },
      { range: '90+', count: Number(row?.bucket_90_plus || 0) }
    ];
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó tiempos de reparación', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, mean: Number(mean.toFixed(2)), count: Number(row?.count || 0), histogram: hist };
  }

  async getRentabilidadPorFalla(query={}, ctx=null){
    const { from, to } = this._resolveRange(query, 180);
    const sql = `SELECT f.Id AS IdFalla, f.Nombre AS falla, COUNT(*) AS repairs, SUM(CONVERT(float, o.TotalReparacion)) AS revenue, SUM(CONVERT(float, o.CostoRepuestos + o.PrecioManoObra)) AS cost FROM OrdenReparacion o INNER JOIN OrdenFalla ofa ON ofa.IdOrdenReparacion = o.Id INNER JOIN Falla f ON ofa.IdFalla = f.Id WHERE o.FechaEmision >= :from AND o.FechaEmision <= :to GROUP BY f.Id, f.Nombre ORDER BY repairs DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const mapped = rows.map(r=>{ const revenue = Number(r.revenue||0); const cost = Number(r.cost||0); const margin = revenue - cost; const marginPct = revenue>0? Number(((margin/revenue)*100).toFixed(2)):0; return { id: r.IdFalla, falla: r.falla, repairs: Number(r.repairs||0), revenue: Number(revenue.toFixed(2)), cost: Number(cost.toFixed(2)), margin: Number(margin.toFixed(2)), marginPct }; });
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó rentabilidad por falla', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries: mapped };
  }

}

import { auditar } from '../../../core/utils/audit.util.js';
import { sequelize } from '../../../models/index.js';
import { QueryTypes } from 'sequelize';

const VALID_GRAN = ['day','week','month','year'];

function formatISO(d) { if (!d) return null; const z = new Date(d); return z.toISOString().slice(0,19).replace('T',' '); }
function buildPeriodExpr(gran) {
  switch (gran) {
    case 'month': return "CONVERT(char(7), Fecha, 120)";
    case 'year': return "CAST(YEAR(Fecha) AS VARCHAR(4))";
    case 'week': return "CONCAT(YEAR(Fecha), '-', RIGHT('00'+CAST(DATEPART(iso_week,Fecha) AS VARCHAR(2)),2))";
    case 'day':
    default: return "CONVERT(char(10), Fecha, 23)";
  }
}

export default class ComprasDashboardService {
  constructor(bitacoraService = null) { this.bitacoraService = bitacoraService; }

  // ... (content copied from original compras-dashboard.service)
  async getCostoEvolucion(query = {}, ctx = null) {
    const gran = VALID_GRAN.includes((query.granularity||'').toLowerCase()) ? query.granularity.toLowerCase() : 'day';
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setDate(f.getDate()-29); from = f; }
    const periodExpr = buildPeriodExpr(gran);
    const sql = `SELECT ${periodExpr} AS period, SUM(CONVERT(float, TotalCosto)) AS totalCosto FROM Compra WHERE Fecha >= :from AND Fecha <= :to GROUP BY ${periodExpr} ORDER BY period`;
    const replacements = { from: formatISO(from), to: formatISO(to) };
    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó evolución costo de compras', `gran=${gran}`);
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series: rows };
  }

  async getComprasPorProveedor(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setDate(f.getDate()-29); from = f; }
    const sql = `SELECT p.Id AS IdProveedor, p.Nombre AS proveedor, SUM(CONVERT(float, c.TotalCosto)) AS totalComprado, COUNT(DISTINCT c.Id) AS comprasCount FROM Compra c INNER JOIN Proveedor p ON c.IdProveedor = p.Id WHERE c.Fecha >= :from AND c.Fecha <= :to GROUP BY p.Id, p.Nombre ORDER BY totalComprado DESC`;
    const replacements = { from: formatISO(from), to: formatISO(to) };
    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó compras por proveedor', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, proveedores: rows };
  }

  async getRankingProveedores(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setDate(f.getDate()-29); from = f; }
    const order = query.order || 'monto';
    const sql = `SELECT p.Id AS IdProveedor, p.Nombre AS proveedor,
      SUM(CONVERT(float, c.TotalCosto)) AS monto,
      SUM(CONVERT(float, dc.Cantidad)) AS cantidadProductos,
      COUNT(DISTINCT c.Id) AS frecuencia,
      CASE WHEN SUM(dc.Cantidad) > 0 THEN SUM(CONVERT(float, dc.Cantidad * dc.PrecioCostoUnitario))/SUM(CONVERT(float, dc.Cantidad)) ELSE 0 END AS precioPromedio
      FROM Compra c
      LEFT JOIN DetalleCompra dc ON dc.IdCompra = c.Id
      LEFT JOIN Proveedor p ON c.IdProveedor = p.Id
      WHERE c.Fecha >= :from AND c.Fecha <= :to
      GROUP BY p.Id, p.Nombre`;

    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const sorted = rows.sort((a,b)=>{
      switch(order){
        case 'cantidad': return (Number(b.cantidadProductos||0)-Number(a.cantidadProductos||0));
        case 'frecuencia': return (Number(b.frecuencia||0)-Number(a.frecuencia||0));
        case 'precio': return (Number(b.precioPromedio||0)-Number(a.precioPromedio||0));
        case 'monto':
        default: return (Number(b.monto||0)-Number(a.monto||0));
      }
    });
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, `Consultó ranking proveedores orden=${order}`, `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, entries: sorted };
  }

  async getEvolucionPrecioProducto(query = {}, ctx = null) {
    if (!query.productoId) throw new Error('productoId is required');
    const gran = VALID_GRAN.includes((query.granularity||'').toLowerCase()) ? query.granularity.toLowerCase() : 'month';
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setMonth(f.getMonth()-5); from = f; }
    const periodExpr = buildPeriodExpr(gran);
    const sql = `SELECT ${periodExpr} AS period, AVG(CONVERT(float, dc.PrecioCostoUnitario)) AS avgPrecio FROM Compra c INNER JOIN DetalleCompra dc ON dc.IdCompra = c.Id INNER JOIN Inventario i ON dc.IdInventario = i.Id WHERE c.Fecha >= :from AND c.Fecha <= :to AND i.IdProducto = :productoId GROUP BY ${periodExpr} ORDER BY period`;
    const replacements = { from: formatISO(from), to: formatISO(to), productoId: query.productoId };
    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó evolución precio de compra', `producto=${query.productoId}`);
    return { period: { from: from.toISOString(), to: to.toISOString(), granularity: gran }, series: rows };
  }

  async getVariacionPrecioProveedor(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setMonth(f.getMonth()-3); from = f; }
    const whereProducto = query.productoId ? ' AND i.IdProducto = :productoId' : '';
    const sql = `SELECT p.Id AS IdProveedor, p.Nombre AS proveedor, dc.PrecioCostoUnitario AS precioUnitario FROM Compra c INNER JOIN DetalleCompra dc ON dc.IdCompra = c.Id INNER JOIN Inventario i ON dc.IdInventario = i.Id INNER JOIN Proveedor p ON c.IdProveedor = p.Id WHERE c.Fecha >= :from AND c.Fecha <= :to ${whereProducto}`;
    const replacements = { from: formatISO(from), to: formatISO(to) };
    if (query.productoId) replacements.productoId = query.productoId;
    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    const map = new Map();
    for (const r of rows) {
      const id = String(r.IdProveedor);
      if (!map.has(id)) map.set(id, { proveedor: r.proveedor, prices: [] });
      map.get(id).prices.push(Number(r.precioUnitario||0));
    }
    const result = [];
    for (const [id, v] of map.entries()) result.push({ id: Number(id), proveedor: v.proveedor, prices: v.prices });
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó variación precio por proveedor', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, data: result };
  }

  async getABCCompras(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date(); if (!from) { const f = new Date(to); f.setMonth(f.getMonth()-5); from = f; }
    const sql = `SELECT p.Id AS IdProducto, p.Nombre AS producto, SUM(CONVERT(float, dc.Cantidad * dc.PrecioCostoUnitario)) AS total FROM Compra c INNER JOIN DetalleCompra dc ON dc.IdCompra = c.Id INNER JOIN Inventario i ON dc.IdInventario = i.Id INNER JOIN Producto p ON i.IdProducto = p.Id WHERE c.Fecha >= :from AND c.Fecha <= :to GROUP BY p.Id, p.Nombre ORDER BY total DESC`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const totalSum = rows.reduce((s,r)=>s+Number(r.total||0),0);
    let cumulative = 0; const entries = [];
    for (const r of rows) {
      const pct = totalSum>0? (Number(r.total||0)/totalSum)*100:0;
      cumulative += pct;
      let cls = 'C'; if (cumulative <= 80) cls='A'; else if (cumulative <= 95) cls='B';
      entries.push({ id: r.IdProducto, producto: r.producto, total: Number(r.total||0), percentage: Number(pct.toFixed(2)), cumulative: Number(cumulative.toFixed(2)), class: cls });
    }
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó ABC de compras', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, total: totalSum, entries };
  }

  async getPuntoReposicion(query = {}, ctx = null) {
    if (!query.productoId) throw new Error('productoId is required');
    const days = query.days || 90; const leadTime = Number(query.leadTimeDays) || 7;
    const to = new Date(); const from = new Date(); from.setDate(to.getDate()-days);
    const sql = `SELECT SUM(CONVERT(float, dv.Cantidad)) AS qty FROM Venta v INNER JOIN DetalleVenta dv ON dv.IdVenta = v.Id INNER JOIN Inventario i ON dv.IdInventario = i.Id WHERE v.Fecha >= :from AND v.Fecha <= :to AND i.IdProducto = :productoId`;
    const repl = { from: formatISO(from), to: formatISO(to), productoId: query.productoId };
    const rows = await sequelize.query(sql, { replacements: repl, type: QueryTypes.SELECT });
    const totalQty = Number(rows[0]?.qty||0);
    const avgDaily = totalQty / days;
    const reorderPoint = avgDaily * leadTime;
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó punto de reposición', `producto=${query.productoId}`);
    return { productoId: query.productoId, periodDays: days, avgDailyDemand: Number(avgDaily.toFixed(4)), leadTimeDays: leadTime, reorderPoint: Number(reorderPoint.toFixed(4)) };
  }

  async getStockSeguridad(query = {}, ctx = null) {
    if (!query.productoId) throw new Error('productoId is required');
    const days = query.days || 90; const leadTime = Number(query.leadTimeDays) || 7; const serviceLevel = Number(query.serviceLevel) || 0.95;
    const zMap = { '0.9':1.28, '0.95':1.65, '0.99':2.33 };
    const z = zMap[String(serviceLevel)] || 1.65;
    const to = new Date(); const from = new Date(); from.setDate(to.getDate()-days);
    const sql = `SELECT CONVERT(char(10), v.Fecha, 23) as Fecha, SUM(CONVERT(float, dv.Cantidad)) AS qty FROM Venta v INNER JOIN DetalleVenta dv ON dv.IdVenta = v.Id INNER JOIN Inventario i ON dv.IdInventario = i.Id WHERE v.Fecha >= :from AND v.Fecha <= :to AND i.IdProducto = :productoId GROUP BY CONVERT(char(10), v.Fecha, 23)`;
    const repl = { from: formatISO(from), to: formatISO(to), productoId: query.productoId };
    const rows = await sequelize.query(sql, { replacements: repl, type: QueryTypes.SELECT });
    const dailyQtys = rows.map(r=>Number(r.qty||0));
    const mean = dailyQtys.reduce((s,x)=>s+x,0)/Math.max(1,dailyQtys.length);
    const variance = dailyQtys.reduce((s,x)=>s+Math.pow(x-mean,2),0)/Math.max(1,dailyQtys.length);
    const sd = Math.sqrt(variance);
    const sigmaLT = sd * Math.sqrt(leadTime);
    const safetyStock = z * sigmaLT;
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó stock de seguridad', `producto=${query.productoId}`);
    return { productoId: query.productoId, meanDaily: Number(mean.toFixed(4)), sdDaily: Number(sd.toFixed(4)), leadTimeDays: leadTime, serviceLevel, z, safetyStock: Number(safetyStock.toFixed(4)) };
  }

  async getEOQ(query = {}, ctx = null) {
    if (!query.productoId) throw new Error('productoId is required');
    const days = query.days || 365;
    const to = new Date(); const from = new Date(); from.setDate(to.getDate()-days);
    const sql = `SELECT SUM(CONVERT(float, dv.Cantidad)) AS qty FROM Venta v INNER JOIN DetalleVenta dv ON dv.IdVenta = v.Id INNER JOIN Inventario i ON dv.IdInventario = i.Id WHERE v.Fecha >= :from AND v.Fecha <= :to AND i.IdProducto = :productoId`;
    const repl = { from: formatISO(from), to: formatISO(to), productoId: query.productoId };
    const rows = await sequelize.query(sql, { replacements: repl, type: QueryTypes.SELECT });
    const annualDemand = (Number(rows[0]?.qty||0) / Math.max(1, days)) * 365;
    const orderingCost = Number(query.orderingCost || query.S || 50);
    let holdingCost = Number(query.holdingCost || 0);
    if (!holdingCost) {
      if (query.holdingCostPercent && query.unitCost) holdingCost = Number(query.holdingCostPercent) * Number(query.unitCost);
      else holdingCost = 1;
    }
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    if (this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó EOQ', `producto=${query.productoId}`);
    return { productoId: query.productoId, annualDemand: Number(annualDemand.toFixed(2)), orderingCost, holdingCost: Number(holdingCost.toFixed(4)), eoq: Number(eoq.toFixed(2)) };
  }
}

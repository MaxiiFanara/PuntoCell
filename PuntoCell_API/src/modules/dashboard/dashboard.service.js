import { auditar } from '../../core/utils/audit.util.js';
import { sequelize } from '../../models/index.js';
import { QueryTypes } from 'sequelize';

const VALID_GRAN = ['day', 'week', 'month', 'year'];

function formatISO(d) {
  if (!d) return null;
  const z = new Date(d);
  return z.toISOString().slice(0, 19).replace('T', ' ');
}

function buildPeriodExpr(gran) {
  switch (gran) {
    case 'month': return "CONVERT(char(7), Fecha, 120)";
    case 'year': return "CAST(YEAR(Fecha) AS VARCHAR(4))";
    case 'week': return "CONCAT(YEAR(Fecha), '-', RIGHT('00'+CAST(DATEPART(iso_week,Fecha) AS VARCHAR(2)),2))";
    case 'day':
    default: return "CONVERT(char(10), Fecha, 23)";
  }
}

function recentSalesCte(limit = 1000, whereClause = '') {
  const filter = whereClause ? ` ${whereClause}` : '';
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 100));
  return `WITH ventas_base AS (
      SELECT TOP (${safeLimit}) Id, Fecha, TotalVenta, TotalCosto, IdTurnoCaja
      FROM Venta
      ${filter}
      ORDER BY Fecha DESC, Id DESC
    )`;
}

function salesBranchJoin(alias = 'v') {
  return `INNER JOIN TurnoCaja tc ON tc.Id = ${alias}.IdTurnoCaja`;
}

export default class DashboardService {
  constructor(dashboardDAO = null, bitacoraService = null) {
    this.dashboardDAO = dashboardDAO;
    this.bitacoraService = bitacoraService;
  }

  async getSummary(query = {}, ctx = null) {
    const [salesRow] = await sequelize.query(
      `SELECT COALESCE(SUM(row_count), 0) AS salesCount
       FROM sys.dm_db_partition_stats
       WHERE object_id = OBJECT_ID('dbo.Venta') AND index_id IN (0,1)`,
      { type: QueryTypes.SELECT }
    );
    const [purchasesRow] = await sequelize.query(
      `SELECT COALESCE(SUM(row_count), 0) AS purchasesCount
       FROM sys.dm_db_partition_stats
       WHERE object_id = OBJECT_ID('dbo.Compra') AND index_id IN (0,1)`,
      { type: QueryTypes.SELECT }
    );
    const [repairsRow] = await sequelize.query(
      `SELECT COALESCE(SUM(row_count), 0) AS repairsCount
       FROM sys.dm_db_partition_stats
       WHERE object_id = OBJECT_ID('dbo.OrdenReparacion') AND index_id IN (0,1)`,
      { type: QueryTypes.SELECT }
    );
    const [inventoryRow] = await sequelize.query(
      `SELECT COALESCE(SUM(row_count), 0) AS inventoryCount
       FROM sys.dm_db_partition_stats
       WHERE object_id = OBJECT_ID('dbo.Inventario') AND index_id IN (0,1)`,
      { type: QueryTypes.SELECT }
    );

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó resumen de dashboard', 'summary');
    }

    return {
      ventas: {
        count: Number(salesRow?.salesCount || 0),
        total: null
      },
      compras: {
        count: Number(purchasesRow?.purchasesCount || 0),
        total: null
      },
      reparaciones: {
        count: Number(repairsRow?.repairsCount || 0)
      },
      inventario: {
        count: Number(inventoryRow?.inventoryCount || 0)
      }
    };
  }

  async getSalesEvolution(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;

    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const sql = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT CONVERT(char(10), Fecha, 23) AS period, SUM(CONVERT(float, TotalVenta)) AS total
      FROM ventas_base
      GROUP BY CONVERT(char(10), Fecha, 23)
      ORDER BY period`;

    const replacements = { from: formatISO(from), to: formatISO(to) };
    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó evolución de ventas', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, series: rows };
  }

  // Ventas por categoría: suma Cantidad * PrecioUnitario agrupado por categoria
  async getSalesByCategory(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const baseSql = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT c.Nombre AS category, SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS total
      FROM ventas_base v
      INNER JOIN DetalleVenta dv ON v.Id = dv.IdVenta
      INNER JOIN Inventario i ON dv.IdInventario = i.Id
      INNER JOIN Producto a ON i.IdProducto = a.Id
      INNER JOIN ModeloProducto m ON a.IdModeloProducto = m.Id
      INNER JOIN CategoriaProducto c ON m.IdCategoriaProducto = c.Id
      WHERE v.Fecha >= :from AND v.Fecha <= :to
      GROUP BY c.Nombre ORDER BY total DESC`;

    const replacements = { from: formatISO(from), to: formatISO(to) };

    const rows = await sequelize.query(baseSql, { replacements, type: QueryTypes.SELECT });

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó ventas por categoría', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, categories: rows };
  }

  async getParetoProducts(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const baseSql = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT a.Id AS IdProducto, a.Nombre AS product, SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS total
      FROM ventas_base v
      INNER JOIN DetalleVenta dv ON v.Id = dv.IdVenta
      INNER JOIN Inventario i ON dv.IdInventario = i.Id
      INNER JOIN Producto a ON i.IdProducto = a.Id
      WHERE v.Fecha >= :from AND v.Fecha <= :to
      GROUP BY a.Id, a.Nombre ORDER BY total DESC`;

    const replacements = { from: formatISO(from), to: formatISO(to) };

    const products = await sequelize.query(baseSql, { replacements, type: QueryTypes.SELECT });

    const totalSum = products.reduce((s, p) => s + (Number(p.total) || 0), 0);

    let cumulative = 0;
    const entries = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const value = Number(p.total) || 0;
      const pct = totalSum > 0 ? (value / totalSum) * 100 : 0;
      cumulative += pct;
      entries.push({
        rank: i + 1,
        id: p.IdProducto,
        product: p.product,
        total: value,
        percentage: Number(pct.toFixed(2)),
        cumulativePercentage: Number(cumulative.toFixed(2))
      });
    }

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó Pareto de productos', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, totalRevenue: totalSum, entries };
  }

  // Scatter: precio promedio vs cantidad vendida por producto
  async getPriceQuantityScatter(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const replacements = { from: formatISO(from), to: formatISO(to) };

    const sql = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT a.Id AS IdProducto, a.Nombre AS product,
      SUM(CONVERT(float, dv.Cantidad)) AS quantity,
      SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario)) AS revenue,
      CASE WHEN SUM(dv.Cantidad) > 0 THEN SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario))/SUM(CONVERT(float, dv.Cantidad)) ELSE 0 END AS avgPrice
      FROM ventas_base v
      INNER JOIN DetalleVenta dv ON v.Id = dv.IdVenta
      INNER JOIN Inventario i ON dv.IdInventario = i.Id
      INNER JOIN Producto a ON i.IdProducto = a.Id
      WHERE v.Fecha >= :from AND v.Fecha <= :to
      GROUP BY a.Id, a.Nombre
      ORDER BY revenue DESC`;

    const products = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    const filtered = products.map((p) => ({
      id: p.IdProducto,
      product: p.product,
      avgPrice: Number(Number(p.avgPrice || 0).toFixed(2)),
      quantity: Number(p.quantity || 0),
      revenue: Number(Number(p.revenue || 0).toFixed(2))
    }));

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó dispersión precio-cantidad', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, points: filtered };
  }

  async getPriceElasticity(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!from || !to) throw new Error('from and to are required for elasticity analysis');

    const compFrom = new Date(from); compFrom.setMonth(compFrom.getMonth() - 1);
    const compTo = new Date(to); compTo.setMonth(compTo.getMonth() - 1);

    const baseRepl = { from: formatISO(from), to: formatISO(to) };
    const compRepl = { from: formatISO(compFrom), to: formatISO(compTo) };

    const sql = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT a.Id AS IdProducto, a.Nombre AS product,
      SUM(CONVERT(float, dv.Cantidad)) AS quantity,
      CASE WHEN SUM(dv.Cantidad) > 0 THEN SUM(CONVERT(float, dv.Cantidad * dv.PrecioUnitario))/SUM(CONVERT(float, dv.Cantidad)) ELSE 0 END AS avgPrice
      FROM ventas_base v
      INNER JOIN DetalleVenta dv ON v.Id = dv.IdVenta
      INNER JOIN Inventario i ON dv.IdInventario = i.Id
      INNER JOIN Producto a ON i.IdProducto = a.Id
      WHERE v.Fecha >= :from AND v.Fecha <= :to
      GROUP BY a.Id, a.Nombre
      ORDER BY quantity DESC`;

    const baseRows = await sequelize.query(sql, { replacements: baseRepl, type: QueryTypes.SELECT });
    const compRows = await sequelize.query(sql, { replacements: compRepl, type: QueryTypes.SELECT });

    const mapById = (arr) => {
      const m = new Map();
      for (const r of arr) {
        m.set(String(r.IdProducto), { id: r.IdProducto, product: r.product, quantity: Number(r.quantity||0), avgPrice: Number(r.avgPrice||0) });
      }
      return m;
    };

    const baseMap = mapById(baseRows);
    const compMap = mapById(compRows);

    const keys = new Set([...baseMap.keys(), ...compMap.keys()]);
    const entries = [];
    for (const k of keys) {
      const b = baseMap.get(k) || { quantity: 0, avgPrice: 0, product: compMap.get(k)?.product || 'N/A' };
      const c = compMap.get(k) || { quantity: 0, avgPrice: 0, product: b.product || 'N/A' };

      const pctPrice = b.avgPrice === 0 ? null : ((c.avgPrice - b.avgPrice) / b.avgPrice) * 100;
      const pctQty = b.quantity === 0 ? null : ((c.quantity - b.quantity) / b.quantity) * 100;
      const elasticity = (pctPrice === null || pctQty === null || pctPrice === 0) ? null : Number((pctQty / pctPrice).toFixed(4));

      entries.push({ id: b.id || c.id, product: b.product || c.product, baseAvgPrice: b.avgPrice, compareAvgPrice: c.avgPrice, baseQty: b.quantity, compareQty: c.quantity, pctPriceChange: pctPrice === null ? null : Number(pctPrice.toFixed(2)), pctQtyChange: pctQty === null ? null : Number(pctQty.toFixed(2)), elasticity });
    }

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó elasticidad precio-demanda', `base:${from.toISOString()}-${to.toISOString()} vs comp:${compFrom.toISOString()}-${compTo.toISOString()}`);
    }

    return { basePeriod: { from: from.toISOString(), to: to.toISOString() }, comparePeriod: { from: compFrom.toISOString(), to: compTo.toISOString() }, entries };
  }

  async getSalesByPaymentMethod(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const sqlFinal = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      SELECT m.Nombre AS method, SUM(CONVERT(float, pv.Monto)) AS total, COUNT(*) AS payments
      FROM PagoVenta pv
      INNER JOIN MetodoPago m ON pv.IdMetodoPago = m.Id
      INNER JOIN ventas_base v ON pv.IdVenta = v.Id
      WHERE pv.FechaPago >= :from AND pv.FechaPago <= :to
      GROUP BY m.Nombre
      ORDER BY total DESC`;

    const replacements = { from: formatISO(from), to: formatISO(to) };

    const rows = await sequelize.query(sqlFinal, { replacements, type: QueryTypes.SELECT });

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó ventas por forma de pago', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, methods: rows };
  }

  async getSalesByBranch(query = {}, ctx = null) {
    let from = query.from ? new Date(query.from) : null;
    let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) {
      const f = new Date(to);
      f.setDate(f.getDate() - 29);
      from = f;
    }

    const sqlFinal = `${recentSalesCte(1000, 'WHERE Fecha >= :from AND Fecha <= :to')}
      , detalle_agg AS (
        SELECT IdVenta, SUM(CONVERT(float, Cantidad)) AS units
        FROM DetalleVenta
        GROUP BY IdVenta
      ), ventas_sucursal AS (
        SELECT v.Id, tc.IdSucursal
        FROM ventas_base v
        INNER JOIN TurnoCaja tc ON tc.Id = v.IdTurnoCaja
      )
      SELECT vs.IdSucursal AS IdSucursal, s.Nombre AS sucursal,
        COUNT(DISTINCT v.Id) AS salesCount,
        SUM(CONVERT(float, v.TotalVenta)) AS revenue,
        SUM(CONVERT(float, v.TotalCosto)) AS cost,
        SUM(COALESCE(da.units, 0)) AS units,
        CASE WHEN COUNT(DISTINCT v.Id) > 0 THEN SUM(CONVERT(float, v.TotalVenta))/COUNT(DISTINCT v.Id) ELSE 0 END AS avgTicket
      FROM ventas_base v
      INNER JOIN ventas_sucursal vs ON vs.Id = v.Id
      LEFT JOIN detalle_agg da ON da.IdVenta = v.Id
      LEFT JOIN Sucursal s ON s.Id = vs.IdSucursal
      GROUP BY vs.IdSucursal, s.Nombre
      ORDER BY revenue DESC`;

    const replacements = { from: formatISO(from), to: formatISO(to) };
    const rows = await sequelize.query(sqlFinal, { replacements, type: QueryTypes.SELECT });

    // compute margin percentage
    const mapped = rows.map(r => {
      const revenue = Number(r.revenue || 0);
      const cost = Number(r.cost || 0);
      const margin = revenue - cost;
      const marginPct = revenue > 0 ? Number(((margin / revenue) * 100).toFixed(2)) : 0;
      return { id: r.IdSucursal, sucursal: r.sucursal, salesCount: Number(r.salesCount||0), revenue, cost, units: Number(r.units||0), avgTicket: Number(Number(r.avgTicket||0).toFixed(2)), margin: Number(margin.toFixed(2)), marginPct };
    });

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó ventas por sucursal', `from=${from.toISOString()} to=${to.toISOString()}`);
    }

    return { period: { from: from.toISOString(), to: to.toISOString() }, branches: mapped };
  }

  async getDemandProjection(query = {}, ctx = null) {
    // Use existing elasticity calculation to get base quantities and elasticity per product
    const elasticityResult = await this.getPriceElasticity(query, ctx);
    const basePeriod = elasticityResult.basePeriod;
    const comparePeriod = elasticityResult.comparePeriod;
    let entries = elasticityResult.entries || [];

    const minQ = 0;
    const priceChangePercent = 10;

    const projected = [];
    for (const e of entries) {
      if ((e.baseQty || 0) < minQ) continue;

      const basePrice = e.baseAvgPrice || 0;
      const baseQty = e.baseQty || 0;
      const elasticity = e.elasticity; // may be null

      // Determine percent price change
      let pctPrice = null;
      let newPrice = null;
      pctPrice = priceChangePercent;
      newPrice = basePrice * (1 + pctPrice / 100);

      // If elasticity missing, projection is not possible per product
      let pctQty = null;
      let projectedQty = null;
      if (elasticity !== null && pctPrice !== null) {
        pctQty = elasticity * pctPrice; // elasticity = %ΔQ / %ΔP
        projectedQty = baseQty * (1 + pctQty / 100);
      }

      projected.push({ id: e.id, product: e.product, basePrice, baseQty, elasticity, pctPrice: pctPrice === null ? null : Number(pctPrice.toFixed(4)), pctQty: pctQty === null ? null : Number(pctQty.toFixed(4)), newPrice: newPrice === null ? null : Number(Number(newPrice).toFixed(2)), projectedQty: projectedQty === null ? null : Number(projectedQty.toFixed(2)) });
    }

    if (this.bitacoraService && ctx) {
      await auditar(this.bitacoraService, ctx, 'Consultó proyección de demanda', `from=${basePeriod.from} to=${basePeriod.to}`);
    }

    return { basePeriod, comparePeriod, projection: projected };
  }
}

import { auditar } from '../../../core/utils/audit.util.js';
import { sequelize } from '../../../models/index.js';
import { QueryTypes } from 'sequelize';

function formatISO(d){ if(!d) return null; const z=new Date(d); return z.toISOString().slice(0,19).replace('T',' '); }

export default class AuditoriaDashboardService {
  constructor(bitacoraService = null){ this.bitacoraService = bitacoraService; }

  _resolveRange(query = {}, defaultMonths = 1) {
    let from = query.from ? new Date(query.from) : null; let to = query.to ? new Date(query.to) : null;
    if (!to) to = new Date();
    if (!from) { const f = new Date(to); f.setMonth(f.getMonth() - defaultMonths); from = f; }
    return { from, to };
  }

  async getMatrizEmpleadoOperacion(query = {}, ctx = null){
    const { from, to } = this._resolveRange(query, 1);
    const sql = `SELECT b.IdEmpleado AS IdEmpleado, ISNULL(u.Nombre, 'Sistema') AS empleado, b.Accion AS accion, COUNT(*) AS cnt FROM Bitacora b LEFT JOIN Usuario u ON b.IdEmpleado = u.Id WHERE b.Fecha BETWEEN :from AND :to GROUP BY b.IdEmpleado, ISNULL(u.Nombre,'Sistema'), b.Accion ORDER BY ISNULL(u.Nombre,'Sistema')`;
    const rows = await sequelize.query(sql, { replacements: { from: formatISO(from), to: formatISO(to) }, type: QueryTypes.SELECT });
    const empleados = new Map(); const acciones = new Set();
    for(const r of rows){ acciones.add(r.accion); const id = String(r.IdEmpleado||'null'); if(!empleados.has(id)) empleados.set(id, { id: r.IdEmpleado, empleado: r.empleado, counts: {} }); empleados.get(id).counts[r.accion] = Number(r.cnt||0); }
    const accionesArr = Array.from(acciones);
    const matrix = Array.from(empleados.values()).map(e=>({ id: e.id, empleado: e.empleado, counts: accionesArr.map(a=> e.counts[a]||0) }));
    if(this.bitacoraService && ctx) await auditar(this.bitacoraService, ctx, 'Consultó matriz empleado×operación', `from=${from.toISOString()} to=${to.toISOString()}`);
    return { period: { from: from.toISOString(), to: to.toISOString() }, acciones: accionesArr, matrix };
  }
}

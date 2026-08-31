import { registerAudit, auditar } from '../../../core/utils/audit.util.js';

export default class CotizacionService {
  constructor(cotizacionDAO, bitacoraService = null) {
    this.cotizacionDAO = cotizacionDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.cotizacionDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.cotizacionDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Cotizacion no encontrada (Id=${id})`,
        Accion: 'Obtener Cotizacion',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Cotizacion no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    try {
      const created = await this.cotizacionDAO.create(data);
      await registerAudit(this.bitacoraService, {
        detalle: `Cotizacion creada Id=${created.Id || created.id || ''}`,
        Accion: 'Crear Cotizacion',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando cotizacion - ${err.message}`,
        Accion: 'Crear Cotizacion',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async update(id, data, ctx = null) {
    const item = await this.cotizacionDAO.getById(id);
    if (!item) { const e = new Error('Cotizacion no encontrada'); e.statusCode = 404; throw e; }
    const actualizado = await this.cotizacionDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó la cotización #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const item = await this.cotizacionDAO.getById(id);
    if (!item) { const e = new Error('Cotizacion no encontrada'); e.statusCode = 404; throw e; }
    const eliminado = await this.cotizacionDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó la cotización #${id}`, `Baja de cotización`);
    return eliminado;
  }
}

import { registerAudit, auditar } from '../../../core/utils/audit.util.js';

export default class EstadoReclamoService {
  constructor(dao, bitacoraService = null) {
    this.dao = dao;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `EstadoReclamo no encontrado (Id=${id})`,
        Accion: 'Obtener EstadoReclamo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('EstadoReclamo no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    try {
      const created = await this.dao.create(data);
      await registerAudit(this.bitacoraService, {
        detalle: `EstadoReclamo creado Id=${created.Id || created.id || ''}`,
        Accion: 'Crear EstadoReclamo',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando EstadoReclamo - ${err.message}`,
        Accion: 'Crear EstadoReclamo',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async update(id, data, ctx = null) {
    const item = await this.dao.getById(id);
    if (!item) { const e = new Error('EstadoReclamo no encontrado'); e.statusCode = 404; throw e; }
    const actualizado = await this.dao.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el estado de reclamo #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const item = await this.dao.getById(id);
    if (!item) { const e = new Error('EstadoReclamo no encontrado'); e.statusCode = 404; throw e; }
    const eliminado = await this.dao.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó el estado de reclamo #${id}`, `Baja de estado de reclamo`);
    return eliminado;
  }
}

import { registerAudit } from '../../../core/utils/audit.util.js';

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

  async update(id, data) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoReclamo no encontrado');
    return await this.dao.update(id, data);
  }

  async remove(id) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('EstadoReclamo no encontrado');
    return await this.dao.remove(id);
  }
}

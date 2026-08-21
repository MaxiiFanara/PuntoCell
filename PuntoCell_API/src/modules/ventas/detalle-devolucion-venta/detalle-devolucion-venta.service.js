import { registerAudit } from '../../../core/utils/audit.util.js';

export default class DetalleDevolucionVentaService {
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
        detalle: `DetalleDevolucionVenta no encontrado (Id=${id})`,
        Accion: 'Obtener DetalleDevolucionVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleDevolucionVenta no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    try {
      const created = await this.dao.create(data);
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleDevolucionVenta creado Id=${created.Id || created.id || ''}`,
        Accion: 'Crear DetalleDevolucionVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando DetalleDevolucionVenta - ${err.message}`,
        Accion: 'Crear DetalleDevolucionVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.dao.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleDevolucionVenta no encontrado (Id=${id})`,
        Accion: 'Actualizar DetalleDevolucionVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleDevolucionVenta no encontrado');
    }
    const updated = await this.dao.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `DetalleDevolucionVenta actualizado Id=${id}`,
      Accion: 'Actualizar DetalleDevolucionVenta',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.dao.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleDevolucionVenta no encontrado (Id=${id})`,
        Accion: 'Eliminar DetalleDevolucionVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleDevolucionVenta no encontrado');
    }
    const removed = await this.dao.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `DetalleDevolucionVenta eliminado Id=${id}`,
      Accion: 'Eliminar DetalleDevolucionVenta',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

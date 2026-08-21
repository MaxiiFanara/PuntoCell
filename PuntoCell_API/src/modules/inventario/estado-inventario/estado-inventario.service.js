import { registerAudit } from '../../../core/utils/audit.util.js';

export default class EstadoInventarioService {
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
        detalle: `EstadoInventario no encontrado (Id=${id})`,
        Accion: 'Obtener EstadoInventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('EstadoInventario no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear EstadoInventario duplicado Nombre=${data.Nombre}`,
        Accion: 'Crear EstadoInventario',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('El estado ya existe');
    }
    const created = await this.dao.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `EstadoInventario creado Id=${created.Id || created.id || ''}`,
      Accion: 'Crear EstadoInventario',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.dao.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `EstadoInventario no encontrado (Id=${id})`,
        Accion: 'Actualizar EstadoInventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('EstadoInventario no encontrado');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar EstadoInventario a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar EstadoInventario',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe un estado con ese nombre');
      }
    }
    const updated = await this.dao.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `EstadoInventario actualizado Id=${id}`,
      Accion: 'Actualizar EstadoInventario',
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
        detalle: `EstadoInventario no encontrado (Id=${id})`,
        Accion: 'Eliminar EstadoInventario',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('EstadoInventario no encontrado');
    }
    const removed = await this.dao.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `EstadoInventario eliminado Id=${id}`,
      Accion: 'Eliminar EstadoInventario',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

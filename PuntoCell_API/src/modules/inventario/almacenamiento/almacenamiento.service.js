import { registerAudit } from '../../../core/utils/audit.util.js';

export default class AlmacenamientoService {
  constructor(almacenamientoDAO, bitacoraService = null) {
    this.almacenamientoDAO = almacenamientoDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.almacenamientoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.almacenamientoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Almacenamiento no encontrado`,
        Accion: 'Obtener Almacenamiento',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Almacenamiento no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.almacenamientoDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear Almacenamiento duplicado Capacidad=${data.Capacidad}`,
        Accion: 'Crear Almacenamiento',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('El almacenamiento ya existe');
    }
    const created = await this.almacenamientoDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Almacenamiento creado`,
      Accion: 'Crear Almacenamiento',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.almacenamientoDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Almacenamiento no encontrado`,
        Accion: 'Actualizar Almacenamiento',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Almacenamiento no encontrado');
    }
    if (data.Capacidad !== undefined) {
      const existe = await this.almacenamientoDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar Almacenamiento a Capacidad duplicada=${data.Capacidad}`,
          Accion: 'Actualizar Almacenamiento',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe un almacenamiento con esa capacidad');
      }
    }
    const updated = await this.almacenamientoDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Almacenamiento actualizado`,
      Accion: 'Actualizar Almacenamiento',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.almacenamientoDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Almacenamiento no encontrado`,
        Accion: 'Eliminar Almacenamiento',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Almacenamiento no encontrado');
    }
    const removed = await this.almacenamientoDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Almacenamiento eliminado`,
      Accion: 'Eliminar Almacenamiento',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

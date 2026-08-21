import { registerAudit } from '../../../core/utils/audit.util.js';

export default class MemoriaService {
  constructor(memoriaDAO, bitacoraService = null) {
    this.memoriaDAO = memoriaDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.memoriaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.memoriaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Memoria no encontrada (Id=${id})`,
        Accion: 'Obtener Memoria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Memoria no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.memoriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear Memoria duplicada Capacidad=${data.Capacidad}`,
        Accion: 'Crear Memoria',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('La memoria ya existe');
    }
    const created = await this.memoriaDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Memoria creada Id=${created.Id || created.id || ''}`,
      Accion: 'Crear Memoria',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.memoriaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Memoria no encontrada (Id=${id})`,
        Accion: 'Actualizar Memoria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Memoria no encontrada');
    }
    if (data.Capacidad !== undefined) {
      const existe = await this.memoriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar Memoria a Capacidad duplicada=${data.Capacidad}`,
          Accion: 'Actualizar Memoria',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe una memoria con esa capacidad');
      }
    }
    const updated = await this.memoriaDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Memoria actualizada Id=${id}`,
      Accion: 'Actualizar Memoria',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.memoriaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Memoria no encontrada (Id=${id})`,
        Accion: 'Eliminar Memoria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Memoria no encontrada');
    }
    const removed = await this.memoriaDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Memoria eliminada Id=${id}`,
      Accion: 'Eliminar Memoria',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

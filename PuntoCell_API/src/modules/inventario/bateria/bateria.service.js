import { registerAudit } from '../../../core/utils/audit.util.js';

export default class BateriaService {
  constructor(bateriaDAO, bitacoraService = null) {
    this.bateriaDAO = bateriaDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    // Se ordena por Porcentaje (numérico) en vez de alfabético por Capacidad: acá el
    // orden útil para el usuario es "mejor estado primero", no A→Z de la etiqueta.
    return await this.bateriaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, order: [['Porcentaje', 'DESC']] });
  }

  async getById(id, auditContext = null) {
    const item = await this.bateriaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Batería no encontrada (Id=${id})`,
        Accion: 'Obtener Bateria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Batería no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.bateriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear Bateria duplicada Capacidad=${data.Capacidad}`,
        Accion: 'Crear Bateria',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('La batería ya existe');
    }
    const created = await this.bateriaDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Bateria creada Id=${created.Id || created.id || ''}`,
      Accion: 'Crear Bateria',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.bateriaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Batería no encontrada (Id=${id})`,
        Accion: 'Actualizar Bateria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Batería no encontrada');
    }
    if (data.Capacidad !== undefined) {
      const existe = await this.bateriaDAO.findOne({ where: { Capacidad: data.Capacidad } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar Bateria a Capacidad duplicada=${data.Capacidad}`,
          Accion: 'Actualizar Bateria',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe una batería con esa capacidad');
      }
    }
    const updated = await this.bateriaDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Bateria actualizada Id=${id}`,
      Accion: 'Actualizar Bateria',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.bateriaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Batería no encontrada (Id=${id})`,
        Accion: 'Eliminar Bateria',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Batería no encontrada');
    }
    const removed = await this.bateriaDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Bateria eliminada Id=${id}`,
      Accion: 'Eliminar Bateria',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

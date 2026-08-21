import { registerAudit } from '../../../core/utils/audit.util.js';

export default class ColorService {
  constructor(colorDAO, bitacoraService = null) {
    this.colorDAO = colorDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.colorDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.colorDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Color no encontrado (Id=${id})`,
        Accion: 'Obtener Color',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Color no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.colorDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear Color duplicado Nombre=${data.Nombre}`,
        Accion: 'Crear Color',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('El color ya existe');
    }
    const created = await this.colorDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Color creado Id=${created.Id || created.id || ''}`,
      Accion: 'Crear Color',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.colorDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Color no encontrado (Id=${id})`,
        Accion: 'Actualizar Color',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Color no encontrado');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.colorDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar Color a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar Color',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe un color con ese nombre');
      }
    }
    const updated = await this.colorDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Color actualizado Id=${id}`,
      Accion: 'Actualizar Color',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.colorDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Color no encontrado (Id=${id})`,
        Accion: 'Eliminar Color',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Color no encontrado');
    }
    const removed = await this.colorDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Color eliminado Id=${id}`,
      Accion: 'Eliminar Color',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

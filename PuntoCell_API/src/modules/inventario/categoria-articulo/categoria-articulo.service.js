import { registerAudit } from '../../../core/utils/audit.util.js';

export default class CategoriaArticuloService {
  constructor(dao, bitacoraService = null) {
    this.dao = dao;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES, order: [['Nombre', 'ASC']] });
  }

  async getById(id, auditContext = null) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `CategoriaArticulo no encontrada (Id=${id})`,
        Accion: 'Obtener CategoriaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('CategoriaArticulo no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear CategoriaArticulo duplicada Nombre=${data.Nombre}`,
        Accion: 'Crear CategoriaArticulo',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('La categoría ya existe');
    }
    const created = await this.dao.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `CategoriaArticulo creada Id=${created.Id || created.id || ''}`,
      Accion: 'Crear CategoriaArticulo',
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
        detalle: `CategoriaArticulo no encontrada (Id=${id})`,
        Accion: 'Actualizar CategoriaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('CategoriaArticulo no encontrada');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.dao.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar CategoriaArticulo a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar CategoriaArticulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe una categoría con ese nombre');
      }
    }
    const updated = await this.dao.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `CategoriaArticulo actualizada Id=${id}`,
      Accion: 'Actualizar CategoriaArticulo',
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
        detalle: `CategoriaArticulo no encontrada (Id=${id})`,
        Accion: 'Eliminar CategoriaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('CategoriaArticulo no encontrada');
    }
    const removed = await this.dao.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `CategoriaArticulo eliminada Id=${id}`,
      Accion: 'Eliminar CategoriaArticulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

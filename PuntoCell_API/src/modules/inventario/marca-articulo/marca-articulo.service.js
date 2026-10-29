import { registerAudit } from '../../../core/utils/audit.util.js';

export default class MarcaArticuloService {
  constructor(marcaDAO, bitacoraService = null) {
    this.marcaDAO = marcaDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.marcaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, order: [['Nombre', 'ASC']] });
  }

  async getById(id, auditContext = null) {
    const item = await this.marcaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MarcaArticulo no encontrado`,
        Accion: 'Obtener MarcaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MarcaArticulo no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.marcaDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear MarcaArticulo duplicada Nombre=${data.Nombre}`,
        Accion: 'Crear MarcaArticulo',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('La marca ya existe');
    }
    const created = await this.marcaDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `MarcaArticulo creada`,
      Accion: 'Crear MarcaArticulo',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.marcaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MarcaArticulo no encontrado`,
        Accion: 'Actualizar MarcaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MarcaArticulo no encontrado');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.marcaDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar MarcaArticulo a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar MarcaArticulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe una marca con ese nombre');
      }
    }
    const updated = await this.marcaDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `MarcaArticulo actualizada`,
      Accion: 'Actualizar MarcaArticulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.marcaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MarcaArticulo no encontrado`,
        Accion: 'Eliminar MarcaArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MarcaArticulo no encontrado');
    }
    const removed = await this.marcaDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `MarcaArticulo eliminada`,
      Accion: 'Eliminar MarcaArticulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

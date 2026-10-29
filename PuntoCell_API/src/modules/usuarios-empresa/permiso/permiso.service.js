import { registerAudit } from '../../../core/utils/audit.util.js';

export default class PermisoService {
  constructor(permisoDAO, bitacoraService = null) {
    this.permisoDAO = permisoDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.permisoDAO.getAll({
      page,
      limit
    });
  }

  async getById(id) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) {
      try { await registerAudit(this.bitacoraService, { detalle: `Consulta de permiso fallida: Permiso ${id} no encontrado`, Accion: 'Consultar Permiso', IdEmpleado: null, IdSucursal: null, IpAddress: null }); } catch(e){}
      throw new Error('Permiso no encontrado');
    }
    return permiso;
  }

  async create(data, auditContext = {}) {
    const existe = await this.permisoDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      try { await registerAudit(this.bitacoraService, { detalle: `Registro de permiso fallido: ya existe permiso con nombre ${data.Nombre}`, Accion: 'Registrar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Ya existe un permiso con ese nombre');
    }
    const created = await this.permisoDAO.create(data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Registro de permiso exitoso', Accion: 'Registrar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return created;
  }

  async update(id, data, auditContext = {}) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) {
      try { await registerAudit(this.bitacoraService, { detalle: `Modificación de permiso fallida: Permiso ${id} no encontrado`, Accion: 'Modificar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Permiso no encontrado');
    }
    
    if (data.Nombre) {
      const existe = await this.permisoDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un permiso con ese nombre');
    }
    const updated = await this.permisoDAO.update(id, data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Modificación de permiso exitosa', Accion: 'Modificar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return updated;
  }

  async delete(id, auditContext = {}) {
    const permiso = await this.permisoDAO.getById(id);
    if (!permiso) {
      try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de permiso fallida: Permiso ${id} no encontrado`, Accion: 'Eliminar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Permiso no encontrado');
    }
    // Eliminación física ya que no hay campo 'Activo' en esta tabla
    const eliminado = await this.permisoDAO.remove(id); 
    if (!eliminado) {
      try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de permiso fallida: no se pudo eliminar permiso ${id}`, Accion: 'Eliminar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('No se pudo eliminar el permiso');
    }
    try { await registerAudit(this.bitacoraService, { detalle: 'Eliminación de permiso exitosa', Accion: 'Eliminar Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return true;
  }
}
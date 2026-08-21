import { registerAudit } from '../../../core/utils/audit.util.js';

export default class RolPermisoService {
  constructor(rolPermisoDAO, bitacoraService = null) {
    this.rolPermisoDAO = rolPermisoDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.rolPermisoDAO.getAll({
      page,
      limit
    });
  }

  async create(data, auditContext = {}) {
    const existe = await this.rolPermisoDAO.findOne({ 
      where: { IdRol: data.IdRol, IdPermiso: data.IdPermiso } 
    });
    if (existe) {
      try { await registerAudit(this.bitacoraService, { detalle: `Asignación de permiso fallida: Rol ${data.IdRol} ya tiene permiso ${data.IdPermiso}`, Accion: 'Asignar Permiso a Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('El rol ya tiene asignado este permiso');
    }
    const created = await this.rolPermisoDAO.create(data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Asignación de permiso exitosa', Accion: 'Asignar Permiso a Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return created;
  }

  async delete(idRol, idPermiso, auditContext = {}) {
    // Al ser una clave primaria compuesta, la eliminación física requiere ambos IDs
    const eliminado = await this.rolPermisoDAO.model.destroy({ 
      where: { IdRol: idRol, IdPermiso: idPermiso } 
    });
    if (!eliminado) {
      try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de asignación fallida: no encontrada Rol ${idRol} - Permiso ${idPermiso}`, Accion: 'Eliminar Asignación Rol-Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Asignación no encontrada');
    }
    try { await registerAudit(this.bitacoraService, { detalle: 'Eliminación de asignación exitosa', Accion: 'Eliminar Asignación Rol-Permiso', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return true;
  }
}
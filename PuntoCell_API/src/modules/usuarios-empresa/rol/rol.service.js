import { registerAudit } from '../../../core/utils/audit.util.js';

export default class RolService {
  constructor(rolDAO, bitacoraService = null) {
    this.rolDAO = rolDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.rolDAO.getAll({
      page,
      limit,
      where: { Activo: true },
      attributes: this.ATTRIBUTES,
      order: [['Nombre', 'ASC']]
    });
  }

  async getById(id) {
    const rol = await this.rolDAO.getById(id, {
      attributes: this.ATTRIBUTES
    });
    if (!rol) {
      try { await registerAudit(this.bitacoraService, { detalle: `Consulta de rol fallida: Rol ${id} no encontrado`, Accion: 'Consultar Rol', IdEmpleado: null, IdSucursal: null, IpAddress: null }); } catch(e){}
      throw new Error('Rol no encontrado');
    }
    return rol;
  }

  async create(data, auditContext = {}) {
    const existe = await this.rolDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      try { await registerAudit(this.bitacoraService, { detalle: `Registro de rol fallido: ya existe rol con nombre ${data.Nombre}`, Accion: 'Registrar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Ya existe un rol con ese nombre');
    }
    const created = await this.rolDAO.create(data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Registro de rol exitoso', Accion: 'Registrar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return created;
  }

  async update(id, data, auditContext = {}) {
    const rol = await this.rolDAO.getById(id);
    if (!rol) {
      try { await registerAudit(this.bitacoraService, { detalle: `Modificación de rol fallida: Rol ${id} no encontrado`, Accion: 'Modificar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Rol no encontrado');
    }
    if (data.Nombre) {
      const existe = await this.rolDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe un rol con ese nombre');
    }
    const updated = await this.rolDAO.update(id, data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Modificación de rol exitosa', Accion: 'Modificar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return updated;
  }

  async delete(id, auditContext = {}) {
    const rol = await this.rolDAO.getById(id);
    if (!rol) {
      try { await registerAudit(this.bitacoraService, { detalle: `Baja de rol fallida: Rol ${id} no encontrado`, Accion: 'Eliminar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Rol no encontrado');
    }
    const actualizado = await this.rolDAO.update(id, { Activo: false });
    if (!actualizado) {
      try { await registerAudit(this.bitacoraService, { detalle: `Baja de rol fallida: no se pudo dar de baja rol ${id}`, Accion: 'Eliminar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('No se pudo dar de baja el rol');
    }
    try { await registerAudit(this.bitacoraService, { detalle: 'Baja de rol exitosa', Accion: 'Eliminar Rol', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return true;
  }
}
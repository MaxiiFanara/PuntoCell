import { registerAudit } from '../../../core/utils/audit.util.js';

export default class LocalidadService {
  constructor(localidadDAO, bitacoraService = null) {
    this.localidadDAO = localidadDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.localidadDAO.getAll({
      page,
      limit,
      attributes: this.ATTRIBUTES,
      order: [['Nombre', 'ASC']]
    });
  }

  async getById(id) {
    const localidad = await this.localidadDAO.getById(id, { 
      attributes: this.ATTRIBUTES 
    });
    if (!localidad) {
      try { await registerAudit(this.bitacoraService, { detalle: `Consulta de localidad fallida: Localidad ${id} no encontrada`, Accion: 'Consultar Localidad', IdEmpleado: null, IdSucursal: null, IpAddress: null }); } catch(e){}
      throw new Error('Localidad no encontrada');
    }
    return localidad;
  }

  async create(data, auditContext = {}) {
    const existe = await this.localidadDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      try { await registerAudit(this.bitacoraService, { detalle: `Registro de localidad fallido: ya existe localidad ${data.Nombre}`, Accion: 'Registrar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('La localidad ya existe');
    }
    const created = await this.localidadDAO.create(data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Registro de localidad exitoso', Accion: 'Registrar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return created;
  }

  async update(id, data, auditContext = {}) {
    const localidad = await this.localidadDAO.getById(id);
    if (!localidad) {
      try { await registerAudit(this.bitacoraService, { detalle: `Modificación de localidad fallida: Localidad ${id} no encontrada`, Accion: 'Modificar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Localidad no encontrada');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.localidadDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        try { await registerAudit(this.bitacoraService, { detalle: `Modificación de localidad fallida: nombre ${data.Nombre} ya en uso`, Accion: 'Modificar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
        throw new Error('Ya existe una localidad con ese nombre');
      }
    }
    const updated = await this.localidadDAO.update(id, data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Modificación de localidad exitosa', Accion: 'Modificar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return updated;
  }

  async remove(id, auditContext = {}) {
    const localidad = await this.localidadDAO.getById(id);
    if (!localidad) {
      try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de localidad fallida: Localidad ${id} no encontrada`, Accion: 'Eliminar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Localidad no encontrada');
    }
    const removed = await this.localidadDAO.remove(id);
    try { await registerAudit(this.bitacoraService, { detalle: 'Eliminación de localidad exitosa', Accion: 'Eliminar Localidad', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return removed;
  }
}
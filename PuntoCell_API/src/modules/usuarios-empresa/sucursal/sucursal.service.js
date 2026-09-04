import { registerAudit } from '../../../core/utils/audit.util.js';

export default class SucursalService {
  constructor(sucursalDAO, bitacoraService = null) {
    this.sucursalDAO = sucursalDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.sucursalDAO.getAll({
      page,
      limit,
      where: { Activa: true },
      order: [['Nombre', 'ASC']]
    });
  }

  async getById(id) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) {
      try { await registerAudit(this.bitacoraService, { detalle: `Consulta de sucursal fallida: Sucursal ${id} no encontrada`, Accion: 'Consultar Sucursal', IdEmpleado: null, IdSucursal: null, IpAddress: null }); } catch(e){}
      throw new Error('Sucursal no encontrada');
    }
    return sucursal;
  }

  async create(data, auditContext = {}) {
    // Asignamos la fecha actual si la base de datos no lo hace automáticamente
    const nuevaSucursal = { ...data, CreatedAt: new Date() };
    const created = await this.sucursalDAO.create(nuevaSucursal);
    try { await registerAudit(this.bitacoraService, { detalle: 'Registro de sucursal exitoso', Accion: 'Registrar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return created;
  }

  async update(id, data, auditContext = {}) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) {
      try { await registerAudit(this.bitacoraService, { detalle: `Modificación de sucursal fallida: Sucursal ${id} no encontrada`, Accion: 'Modificar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Sucursal no encontrada');
    }
    const updated = await this.sucursalDAO.update(id, data);
    try { await registerAudit(this.bitacoraService, { detalle: 'Modificación de sucursal exitosa', Accion: 'Modificar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return updated;
  }

  async delete(id, auditContext = {}) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) {
      try { await registerAudit(this.bitacoraService, { detalle: `Baja de sucursal fallida: Sucursal ${id} no encontrada`, Accion: 'Eliminar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('Sucursal no encontrada');
    }
    // Baja lógica
    const actualizado = await this.sucursalDAO.update(id, { Activa: false });
    if (!actualizado) {
      try { await registerAudit(this.bitacoraService, { detalle: `Baja de sucursal fallida: no se pudo dar de baja sucursal ${id}`, Accion: 'Eliminar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('No se pudo dar de baja la sucursal');
    }
    try { await registerAudit(this.bitacoraService, { detalle: 'Baja de sucursal exitosa', Accion: 'Eliminar Sucursal', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return true;
  }
}
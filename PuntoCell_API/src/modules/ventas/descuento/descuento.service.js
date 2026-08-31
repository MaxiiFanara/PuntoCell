import { registerAudit, auditar } from '../../../core/utils/audit.util.js';

export default class DescuentoService {
  constructor(descuentoDAO, bitacoraService = null) {
    this.descuentoDAO = descuentoDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.descuentoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.descuentoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Descuento no encontrado (Id=${id})`,
        Accion: 'Obtener Descuento',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Descuento no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    try {
      const created = await this.descuentoDAO.create(data);
      await registerAudit(this.bitacoraService, {
        detalle: `Descuento creado Id=${created.Id || created.id || ''}`,
        Accion: 'Crear Descuento',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando descuento - ${err.message}`,
        Accion: 'Crear Descuento',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async update(id, data, ctx = null) {
    const item = await this.descuentoDAO.getById(id);
    if (!item) { const e = new Error('Descuento no encontrado'); e.statusCode = 404; throw e; }
    const actualizado = await this.descuentoDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el descuento #${id}`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const item = await this.descuentoDAO.getById(id);
    if (!item) { const e = new Error('Descuento no encontrado'); e.statusCode = 404; throw e; }
    const eliminado = await this.descuentoDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó el descuento #${id}`, `Baja de descuento`);
    return eliminado;
  }
}

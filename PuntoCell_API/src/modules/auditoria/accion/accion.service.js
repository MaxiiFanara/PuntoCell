import { registerAudit } from '../../../core/utils/audit.util.js';

export default class AccionService {
  constructor(dao, bitacoraService = null) {
    this.dao = dao;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) throw new Error('Accion no encontrada');
    return item;
  }

  async create(data, auditContext = {}) {
    const created = await this.dao.create(data);

    // Registrar en bitácora usando helper (si existe)
    try {
      if (this.bitacoraService) {
        const detalle = `Accion creada: Nombre=${created.Nombre} Id=${created.Id}`;
        await registerAudit(this.bitacoraService, {
          detalle,
          Accion: created.Nombre,
          IdEmpleado: auditContext?.IdEmpleado || null,
          IdSucursal: auditContext?.IdSucursal || null,
          IpAddress: auditContext?.IpAddress || null
        });
      }
    } catch (e) {
      console.error('Error registrando bitacora para Accion:', e);
    }

    return created;
  }

  async update(id, data) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('Accion no encontrada');
    return await this.dao.update(id, data);
  }

  async remove(id) {
    const item = await this.dao.getById(id);
    if (!item) throw new Error('Accion no encontrada');
    return await this.dao.remove(id);
  }
}

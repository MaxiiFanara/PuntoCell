import { registerAudit } from '../../../core/utils/audit.util.js';

export default class CuotaService {
  constructor(cuotaDAO, bitacoraService = null) {
    this.cuotaDAO = cuotaDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.cuotaDAO.getAll({
      page,
      limit,
      attributes: this.ATTRIBUTES,
      include: [{
        association: 'venta',
        attributes: ['Id'],
        include: [{ association: 'cliente', attributes: ['Nombre', 'Apellido'] }]
      }]
    });
  }

  async getById(id, auditContext = null) {
    const item = await this.cuotaDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Cuota no encontrada (Id=${id})`,
        Accion: 'Obtener Cuota',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Cuota no encontrada');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const sequelize = this.cuotaDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;
      if (data.IdVenta && models.Venta) {
        const venta = await models.Venta.findByPk(data.IdVenta);
        if (!venta) throw new Error(`Venta no encontrada (Id=${data.IdVenta})`);
      }
      if (data.IdTurnoCaja && models.TurnoCaja) {
        const turno = await models.TurnoCaja.findByPk(data.IdTurnoCaja);
        if (!turno) throw new Error(`TurnoCaja no encontrado (Id=${data.IdTurnoCaja})`);
      }

      const created = await this.cuotaDAO.create(data, { transaction: t });
      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `Cuota creada Id=${created.Id || created.id || ''}`,
        Accion: 'Crear Cuota',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await t.rollback();
      console.error('Error creando Cuota:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear cuota';
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando Cuota - ${message}`,
        Accion: 'Crear Cuota',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error(message);
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.cuotaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Cuota no encontrada (Id=${id})`,
        Accion: 'Actualizar Cuota',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Cuota no encontrada');
    }
    const updated = await this.cuotaDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Cuota actualizada Id=${id}`,
      Accion: 'Actualizar Cuota',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.cuotaDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Cuota no encontrada (Id=${id})`,
        Accion: 'Eliminar Cuota',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Cuota no encontrada');
    }
    const removed = await this.cuotaDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Cuota eliminada Id=${id}`,
      Accion: 'Eliminar Cuota',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

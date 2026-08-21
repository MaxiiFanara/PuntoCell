import { registerAudit } from '../../../core/utils/audit.util.js';

export default class ReclamoGarantiaService {
  constructor(dao, bitacoraService = null) {
    this.dao = dao;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dao.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.dao.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `ReclamoGarantia no encontrado (Id=${id})`,
        Accion: 'Obtener ReclamoGarantia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ReclamoGarantia no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const sequelize = this.dao.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;
      if (data.IdDetalleVenta && models.DetalleVenta) {
        const det = await models.DetalleVenta.findByPk(data.IdDetalleVenta);
        if (!det) throw new Error(`DetalleVenta no encontrado (Id=${data.IdDetalleVenta})`);
      }
      if (data.IdEmpleado && models.Usuario) {
        const emp = await models.Usuario.findByPk(data.IdEmpleado);
        if (!emp) throw new Error(`Empleado no encontrado (Id=${data.IdEmpleado})`);
      }
      if (data.IdEstadoReclamo && models.EstadoReclamo) {
        const est = await models.EstadoReclamo.findByPk(data.IdEstadoReclamo);
        if (!est) throw new Error(`EstadoReclamo no encontrado (Id=${data.IdEstadoReclamo})`);
      }

      const created = await this.dao.create(data, { transaction: t });
      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `ReclamoGarantia creado Id=${created.Id || created.id || ''}`,
        Accion: 'Crear ReclamoGarantia',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return created;
    } catch (err) {
      await t.rollback();
      console.error('Error creando ReclamoGarantia:', err && (err.stack || err.message || err));
      if (err.original) console.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear reclamo';
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando ReclamoGarantia - ${message}`,
        Accion: 'Crear ReclamoGarantia',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error(message);
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.dao.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `ReclamoGarantia no encontrado (Id=${id})`,
        Accion: 'Actualizar ReclamoGarantia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ReclamoGarantia no encontrado');
    }
    const updated = await this.dao.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `ReclamoGarantia actualizado Id=${id}`,
      Accion: 'Actualizar ReclamoGarantia',
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
        detalle: `ReclamoGarantia no encontrado (Id=${id})`,
        Accion: 'Eliminar ReclamoGarantia',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ReclamoGarantia no encontrado');
    }
    const removed = await this.dao.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `ReclamoGarantia eliminado Id=${id}`,
      Accion: 'Eliminar ReclamoGarantia',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

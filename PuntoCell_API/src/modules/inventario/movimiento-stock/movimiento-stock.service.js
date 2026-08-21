import { registerAudit } from '../../../core/utils/audit.util.js';

export default class MovimientoStockService {
  constructor(movimientoStockDAO, bitacoraService = null) {
    this.movimientoStockDAO = movimientoStockDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  _getRelatedModels() {
    const sequelize = this.movimientoStockDAO.model.sequelize;
    return {
      Inventario: sequelize.models.Inventario,
      Usuario: sequelize.models.Usuario
    };
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    const { Inventario, Usuario } = this._getRelatedModels();
    return await this.movimientoStockDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, include: [
      { model: Inventario, as: 'inventario', attributes: ['Id'] },
      { model: Usuario, as: 'empleado', attributes: ['Id', 'Nombre'] }
    ] });
  }

  async getById(id, auditContext = null) {
    const { Inventario, Usuario } = this._getRelatedModels();
    const item = await this.movimientoStockDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: Inventario, as: 'inventario', attributes: ['Id'] },
      { model: Usuario, as: 'empleado', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MovimientoStock no encontrado (Id=${id})`,
        Accion: 'Obtener MovimientoStock',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MovimientoStock no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const { Inventario, Usuario } = this._getRelatedModels();
    const inv = await Inventario.findByPk(data.IdInventario);
    if (!inv) {
      await registerAudit(this.bitacoraService, {
        detalle: `Inventario no encontrado Id=${data.IdInventario}`,
        Accion: 'Crear MovimientoStock',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Inventario no encontrado');
    }
    const emp = await Usuario.findByPk(data.IdEmpleado);
    if (!emp) {
      await registerAudit(this.bitacoraService, {
        detalle: `Empleado no encontrado Id=${data.IdEmpleado}`,
        Accion: 'Crear MovimientoStock',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Empleado no encontrado');
    }

    const created = await this.movimientoStockDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `MovimientoStock creado Id=${created.Id || created.id || ''}`,
      Accion: 'Crear MovimientoStock',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.movimientoStockDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MovimientoStock no encontrado (Id=${id})`,
        Accion: 'Actualizar MovimientoStock',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MovimientoStock no encontrado');
    }
    const { Inventario, Usuario } = this._getRelatedModels();
    if (data.IdInventario !== undefined) {
      const inv = await Inventario.findByPk(data.IdInventario);
      if (!inv) {
        await registerAudit(this.bitacoraService, {
          detalle: `Inventario no encontrado Id=${data.IdInventario}`,
          Accion: 'Actualizar MovimientoStock',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Inventario no encontrado');
      }
    }
    if (data.IdEmpleado !== undefined) {
      const emp = await Usuario.findByPk(data.IdEmpleado);
      if (!emp) {
        await registerAudit(this.bitacoraService, {
          detalle: `Empleado no encontrado Id=${data.IdEmpleado}`,
          Accion: 'Actualizar MovimientoStock',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Empleado no encontrado');
      }
    }

    const updated = await this.movimientoStockDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `MovimientoStock actualizado Id=${id}`,
      Accion: 'Actualizar MovimientoStock',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.movimientoStockDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `MovimientoStock no encontrado (Id=${id})`,
        Accion: 'Eliminar MovimientoStock',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MovimientoStock no encontrado');
    }
    const removed = await this.movimientoStockDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `MovimientoStock eliminado Id=${id}`,
      Accion: 'Eliminar MovimientoStock',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

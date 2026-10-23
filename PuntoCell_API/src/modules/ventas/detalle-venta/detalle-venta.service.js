import { registerAudit } from '../../../core/utils/audit.util.js';

export default class DetalleVentaService {
  constructor(detalleDAO, bitacoraService = null) {
    this.detalleDAO = detalleDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.detalleDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.detalleDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleVenta no encontrado`,
        Accion: 'Obtener DetalleVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleVenta no encontrado');
    }
    return item;
  }

  // Este endpoint (`POST /ventas/detalle-ventas`) es un camino de alta independiente del de
  // `VentaService.create()` (que ya descuenta stock en su propia transacción) — así que acá
  // también hace falta verificar/descontar Stock, para no vender dos veces la misma unidad
  // (mismo IMEI) si alguien pega directo a este endpoint en vez de usar POST /ventas.
  async create(data, auditContext = null) {
    const sequelize = this.detalleDAO.model.sequelize;
    const { Inventario } = sequelize.models;
    const t = await sequelize.transaction();
    try {
      const inv = await Inventario.findByPk(data.IdArticulo, { transaction: t, lock: t.LOCK.UPDATE });
      if (!inv) throw new Error(`Inventario no encontrado (Id=${data.IdArticulo})`);
      if (Number(inv.Stock) < Number(data.Cantidad)) {
        throw new Error(
          inv.IMEI
            ? `El producto con IMEI ${inv.IMEI} ya no tiene stock disponible (fue vendido o no está en stock).`
            : `Stock insuficiente para el producto (Id ${inv.Id}). Disponible: ${inv.Stock}, solicitado: ${data.Cantidad}.`
        );
      }
      await inv.update({ Stock: inv.Stock - data.Cantidad }, { transaction: t });
      const detalle = await this.detalleDAO.create(data, { transaction: t });
      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleVenta creado`,
        Accion: 'Crear DetalleVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return detalle;
    } catch (err) {
      await t.rollback();
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando detalle venta - ${err.message}`,
        Accion: 'Crear DetalleVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.detalleDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleVenta no encontrado`,
        Accion: 'Actualizar DetalleVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleVenta no encontrado');
    }
    const updated = await this.detalleDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `DetalleVenta actualizado`,
      Accion: 'Actualizar DetalleVenta',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.detalleDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `DetalleVenta no encontrado`,
        Accion: 'Eliminar DetalleVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('DetalleVenta no encontrado');
    }
    const removed = await this.detalleDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `DetalleVenta eliminado`,
      Accion: 'Eliminar DetalleVenta',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

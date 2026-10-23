import { registerAudit } from '../../../core/utils/audit.util.js';
import logger from '../../../core/utils/logger.js';
import { esMetodoEfectivo, montoEfectivo } from '../../../core/utils/efectivo.util.js';

export default class PagoVentaService {
  constructor(pagoDAO, bitacoraService = null, cajaService = null) {
    this.pagoDAO = pagoDAO;
    this.bitacoraService = bitacoraService;
    this.cajaService = cajaService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.pagoDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    const item = await this.pagoDAO.getById(id, { attributes: this.ATTRIBUTES });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `PagoVenta no encontrado`,
        Accion: 'Obtener PagoVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('PagoVenta no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const sequelize = this.pagoDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const models = sequelize.models;
      let venta = null;

      // Validate Venta exists
      if (data.IdVenta && models.Venta) {
        venta = await models.Venta.findByPk(data.IdVenta);
        if (!venta) throw new Error(`Venta no encontrada (Id=${data.IdVenta})`);
      }

      // determine Pagado flag (default to true when not provided)
      const pagadoFlag = (data.Pagado !== undefined) ? !!data.Pagado : true;
      const payload = { ...data, Pagado: pagadoFlag };
      // En efectivo el cobro es siempre un importe entero.
      if (await esMetodoEfectivo(models, payload.IdMetodoPago, t)) payload.Monto = montoEfectivo(payload.Monto);

      const pago = await this.pagoDAO.create(payload, { transaction: t });

      let nombreCliente = 'Consumidor Final';
      if (venta && venta.IdCliente) {
        const clienteRecord = await models.Usuario.findByPk(venta.IdCliente, { transaction: t });
        if (clienteRecord) {
          nombreCliente = `${clienteRecord.Nombre} ${clienteRecord.Apellido}`.trim();
        }
      }

      if (this.cajaService) {
        await this.cajaService.registrarIngreso({
          IdTurnoCaja: data.IdTurnoCaja,
          IdEmpleado: auditContext?.IdEmpleado || venta?.IdEmpleado,
          Monto: payload.Monto,
          IdMetodoPago: payload.IdMetodoPago,
          Descripcion: data.Observacion && data.Observacion.toLowerCase().includes('cuota') 
            ? `Cobro de cuota - Venta #${data.IdVenta} - Cliente: ${nombreCliente}` 
            : `Cobro de venta #${data.IdVenta} - Cliente: ${nombreCliente}`,
          Fecha: payload.FechaPago
        }, { transaction: t });
      }

      // If pagado, update Venta.EstadoPago to true
      if (pagadoFlag && models.Venta) {
        await models.Venta.update({ EstadoPago: true }, { where: { Id: data.IdVenta }, transaction: t });
      }

      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `PagoVenta creado`,
        Accion: 'Crear PagoVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return pago;
    } catch (err) {
      await t.rollback();
      logger.error('Error creando PagoVenta:', err && (err.stack || err.message || err));
      if (err.original) logger.error('SQL Error detail:', err.original);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear pago';
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando PagoVenta - ${message}`,
        Accion: 'Crear PagoVenta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error(message);
    }
  }

  async update(id, data, auditContext = null) {
    const item = await this.pagoDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `PagoVenta no encontrado`,
        Accion: 'Actualizar PagoVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('PagoVenta no encontrado');
    }

    const sequelize = this.pagoDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const pagadoFlag = (data.Pagado !== undefined) ? !!data.Pagado : undefined;

      const payload = { ...data };
      if (pagadoFlag !== undefined) payload.Pagado = pagadoFlag;

      const updated = await this.pagoDAO.update(id, payload, { transaction: t });

      // if changed to pagado, set Venta.EstadoPago
      if (pagadoFlag && payload.IdVenta) {
        await sequelize.models.Venta.update({ EstadoPago: true }, { where: { Id: payload.IdVenta }, transaction: t });
      }

      await t.commit();
      await registerAudit(this.bitacoraService, {
        detalle: `PagoVenta actualizado`,
        Accion: 'Actualizar PagoVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      return updated;
    } catch (err) {
      await t.rollback();
      logger.error('Error actualizando PagoVenta:', err && (err.stack || err.message || err));
      await registerAudit(this.bitacoraService, {
        detalle: `Error actualizando PagoVenta - ${err.message}`,
        Accion: 'Actualizar PagoVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw err;
    }
  }

  async remove(id, auditContext = null) {
    const item = await this.pagoDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `PagoVenta no encontrado`,
        Accion: 'Eliminar PagoVenta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('PagoVenta no encontrado');
    }
    const removed = await this.pagoDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `PagoVenta eliminado`,
      Accion: 'Eliminar PagoVenta',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

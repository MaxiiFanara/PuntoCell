import { Op } from 'sequelize';
import { registerAudit, auditar } from '../../../core/utils/audit.util.js';

const round2 = (v) => Number(Number(v || 0).toFixed(2));

export default class VentaService {
  constructor(ventaDAO, detalleDAO, bitacoraService = null) {
    this.ventaDAO = ventaDAO;
    this.detalleDAO = detalleDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.ventaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id, auditContext = null) {
    try {
      const item = await this.ventaDAO.getById(id, {
        attributes: this.ATTRIBUTES,
        include: [
          {
            association: 'detalles',
            include: [{
              association: 'inventario',
              include: [
                { association: 'articulo', include: [{ association: 'modelo', include: [{ association: 'marca' }] }] },
                { association: 'color' },
                { association: 'memoria' },
                { association: 'bateria' },
              ]
            }]
          },
          { association: 'cliente', attributes: ['Nombre', 'Apellido', 'DNI'] },
          { association: 'empleado', attributes: ['Nombre', 'Apellido'] },
          { association: 'cotizacion' },
          {
            association: 'pagos',
            include: [{ association: 'metodoPago', attributes: ['Nombre'] }]
          },
          { association: 'turnoCaja', include: [{ association: 'sucursal', attributes: ['Nombre'] }] },
        ]
      });
      if (!item) {
        await registerAudit(this.bitacoraService, {
          detalle: `Venta no encontrada (Id=${id})`,
          Accion: 'Obtener Venta',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Venta no encontrada');
      }
      return item;
    } catch (err) {
      await registerAudit(this.bitacoraService, {
        detalle: `Error al obtener venta (Id=${id}) - ${err.message}`,
        Accion: 'Obtener Venta',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Error al obtener venta');
    }
  }

  async create(data, auditContext = null) {
    const sequelize = this.ventaDAO.model.sequelize;
    const t = await sequelize.transaction();
    let ventaData = null;
    let detalles = [];
    let pagos = [];
    let cuotas = [];

    try {
      detalles = data.Detalles || [];
      pagos = data.Pagos || [];
      cuotas = data.Cuotas || [];
      ventaData = { ...data };
      delete ventaData.Detalles;
      delete ventaData.Pagos; // no son columnas de la tabla Venta
      delete ventaData.Cuotas;

      // USD (TotalVenta) es la fuente de verdad; TotalVentaARS es solo su representación
      // visual, así que no confiamos en lo que calculó el frontend: la recalculamos acá con
      // la MISMA cotización ya congelada en IdCotizacionDolar.
      const cotizacion = await sequelize.models.Cotizacion.findByPk(ventaData.IdCotizacionDolar, { transaction: t });
      if (!cotizacion) throw new Error(`Cotización no encontrada (Id=${ventaData.IdCotizacionDolar})`);
      ventaData.TotalVentaARS = round2(ventaData.TotalVenta * cotizacion.Valor);

      const venta = await this.ventaDAO.create(ventaData, { transaction: t });
      const pk = this.ventaDAO.model.primaryKeyAttribute || 'Id';
      const ventaId = venta[pk] || (venta.get && venta.get(pk));

      // Descuenta stock dentro de la misma transacción: evita vender dos veces la misma unidad
      const { Inventario } = sequelize.models;
      for (const d of detalles) {
        // Lock de fila: evita que dos ventas concurrentes lean el mismo Stock a la vez
        const inv = await Inventario.findByPk(d.IdArticulo, { transaction: t, lock: t.LOCK.UPDATE });
        if (!inv) throw new Error(`Inventario no encontrado (Id=${d.IdArticulo})`);
        if (Number(inv.Stock) < Number(d.Cantidad)) {
          throw new Error(
            inv.IMEI
              ? `El producto con IMEI ${inv.IMEI} ya no tiene stock disponible (fue vendido o no está en stock).`
              : `Stock insuficiente para el producto (Id ${inv.Id}). Disponible: ${inv.Stock}, solicitado: ${d.Cantidad}.`
          );
        }
        await inv.update({ Stock: inv.Stock - d.Cantidad }, { transaction: t });

        const detallePayload = { ...d, IdVenta: ventaId };
        await this.detalleDAO.create(detallePayload, { transaction: t });
      }

      // Pagos asociados
      if (pagos.length > 0 && sequelize.models.PagoVenta) {
        for (const p of pagos) {
          await sequelize.models.PagoVenta.create({
            IdVenta: ventaId,
            IdMetodoPago: p.IdMetodoPago,
            Monto: p.Monto,
            Observacion: p.Observacion || '',
            FechaPago: p.FechaPago ? new Date(p.FechaPago) : new Date(),
            IdTurnoCaja: p.IdTurnoCaja || ventaData.IdTurnoCaja
          }, { transaction: t });
        }
      }

      // Cuotas (venta financiada)
      if (cuotas.length > 0 && sequelize.models.Cuota) {
        for (const c of cuotas) {
          await sequelize.models.Cuota.create({
            NumeroCuota: c.NumeroCuota,
            MontoCuota: c.MontoCuota,
            FechaVencimiento: new Date(c.FechaVencimiento),
            IdVenta: ventaId,
            IdTurnoCaja: c.IdTurnoCaja || ventaData.IdTurnoCaja
          }, { transaction: t });
        }
      }

      await t.commit();

      const Detalle = sequelize.models.DetalleVenta;
      const created = await this.ventaDAO.getById(ventaId, { include: [ { model: Detalle, as: 'detalles' } ] });

      await registerAudit(this.bitacoraService, {
        detalle: `Venta creada Id=${ventaId}`,
        Accion: 'Crear Venta',
        IdEmpleado: data.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});

      return created;
    } catch (err) {
      await t.rollback();
      console.error('❌ Error creando venta transactional:', err);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear venta';
      await registerAudit(this.bitacoraService, {
        detalle: `Error creando venta - ${message}`,
        Accion: 'Crear Venta',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error(message);
    }
  }

  async update(id, data, ctx = null) {
    const updateData = { ...data };
    // Mismo criterio que en create(): si cambia el total en USD, el equivalente ARS se
    // recalcula acá, nunca se toma del body.
    if (updateData.TotalVenta !== undefined) {
      const sequelize = this.ventaDAO.model.sequelize;
      let idCotizacion = updateData.IdCotizacionDolar;
      if (!idCotizacion) {
        const existente = await this.ventaDAO.getById(id);
        idCotizacion = existente?.IdCotizacionDolar;
      }
      const cotizacion = await sequelize.models.Cotizacion.findByPk(idCotizacion);
      if (!cotizacion) throw new Error(`Cotización no encontrada (Id=${idCotizacion})`);
      updateData.TotalVentaARS = round2(updateData.TotalVenta * cotizacion.Valor);
    }
    const actualizado = await this.ventaDAO.update(id, updateData);
    await auditar(this.bitacoraService, ctx, `Modificó la venta #${id}`, `Campos: ${Object.keys(updateData).join(', ')}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const eliminado = await this.ventaDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó la venta #${id}`, `Baja de venta`);
    return eliminado;
  }

  async historico(filters = {}) {
    const sequelize = this.ventaDAO.model.sequelize;
    const { Usuario, DetalleVenta, Inventario, Articulo } = sequelize.models;
    const { cliente, producto, vendedor, idEmpleado, desde, hasta, montoMin } = filters;

    const where = {};
    if (desde) where.Fecha = { ...(where.Fecha || {}), [Op.gte]: new Date(desde) };
    if (hasta) where.Fecha = { ...(where.Fecha || {}), [Op.lte]: new Date(hasta) };
    if (montoMin) where.TotalVentaARS = { [Op.gte]: Number(montoMin) };

    const clienteInclude = { model: Usuario, as: 'cliente', attributes: ['Id', 'Nombre', 'Apellido', 'DNI'] };
    if (cliente) {
      clienteInclude.required = true;
      clienteInclude.where = {
        [Op.or]: [
          { Nombre: { [Op.like]: `%${cliente}%` } },
          { Apellido: { [Op.like]: `%${cliente}%` } },
          { DNI: { [Op.like]: `%${cliente}%` } }
        ]
      };
    }

    const empleadoInclude = { model: Usuario, as: 'empleado', attributes: ['Id', 'Nombre', 'Apellido'] };
    if (idEmpleado) {
      // Selección exacta desde un combo (ver HistorialVentas.jsx) — no ambigüedad de LIKE.
      empleadoInclude.required = true;
      empleadoInclude.where = { Id: Number(idEmpleado) };
    } else if (vendedor) {
      empleadoInclude.required = true;
      empleadoInclude.where = {
        [Op.or]: [
          { Nombre: { [Op.like]: `%${vendedor}%` } },
          { Apellido: { [Op.like]: `%${vendedor}%` } }
        ]
      };
    }

    const articuloInclude = { model: Articulo, as: 'articulo' };
    const inventarioInclude = { model: Inventario, as: 'inventario', include: [articuloInclude] };
    const detalleInclude = { model: DetalleVenta, as: 'detalles', include: [inventarioInclude] };
    if (producto) {
      articuloInclude.required = true;
      articuloInclude.where = { Nombre: { [Op.like]: `%${producto}%` } };
      inventarioInclude.required = true;
      detalleInclude.required = true;
    }

    return await this.ventaDAO.model.findAll({
      where,
      include: [clienteInclude, empleadoInclude, detalleInclude],
      order: [['Fecha', 'DESC'], ['Id', 'DESC']]
    });
  }
}
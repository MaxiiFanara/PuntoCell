import { Op } from 'sequelize';

export default class VentaService {
  constructor(ventaDAO, detalleDAO) {
    this.ventaDAO = ventaDAO;
    this.detalleDAO = detalleDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.ventaDAO.getAll({ page, limit, attributes: this.ATTRIBUTES });
  }

  async getById(id) {
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
      if (!item) throw new Error('Venta no encontrada');
      return item;
    } catch (err) {
      throw new Error('Error al obtener venta');
    }
  }

  async create(data) {
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
            Cotizacion: p.Cotizacion || 1,
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
      return await this.ventaDAO.getById(ventaId, { include: [ { model: Detalle, as: 'detalles' } ] });
    } catch (err) {
      await t.rollback();
      console.error('❌ Error creando venta transactional:', err);
      const message = (err.original && (err.original.message || err.original.sqlMessage)) || err.message || 'Error al crear venta';
      throw new Error(message);
    }
  }

  async update(id, data) {
    return await this.ventaDAO.update(id, data);
  }

  async remove(id) {
    return await this.ventaDAO.remove(id);
  }

  async historico(filters = {}) {
    const sequelize = this.ventaDAO.model.sequelize;
    const { Usuario, DetalleVenta, Inventario, Articulo } = sequelize.models;
    const { cliente, producto, vendedor, idEmpleado, desde, hasta, montoMin } = filters;

    const where = {};
    if (desde) where.Fecha = { ...(where.Fecha || {}), [Op.gte]: new Date(desde) };
    if (hasta) where.Fecha = { ...(where.Fecha || {}), [Op.lte]: new Date(hasta) };
    if (montoMin) where.TotalVentaARS = { [Op.gte]: Number(montoMin) };

    const clienteInclude = { model: Usuario, as: 'cliente' };
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

    const empleadoInclude = { model: Usuario, as: 'empleado' };
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
import { sequelize } from '../../../models/index.js';
import { auditar } from '../../../core/utils/audit.util.js';

export default class OrdenReparacionService {
  constructor(
    usuarioDAO,
    dispositivoClienteDAO,
    ordenReparacionDAO,
    ordenFallaDAO,
    seguimientoOrdenDAO,
    notificacionService,
    bitacoraService = null,
    cajaService = null
  ) {
    this.usuarioDAO = usuarioDAO;
    this.dispositivoClienteDAO = dispositivoClienteDAO;
    this.ordenReparacionDAO = ordenReparacionDAO;
    this.ordenFallaDAO = ordenFallaDAO;
    this.seguimientoOrdenDAO = seguimientoOrdenDAO;
    this.notificacionService = notificacionService;
    this.bitacoraService = bitacoraService;
    this.cajaService = cajaService;
  }

  async create(datosPaquete, idEmpleadoSesion, ctx = null) {
    const { cliente, dispositivo, idsFallas, observacionIngreso, sena } = datosPaquete;
    const t = await sequelize.transaction();

    try {
      // Cliente
let idClienteAsignado = cliente.Id;

if (!idClienteAsignado) {
  const clienteExistente = await this.usuarioDAO.findOne({
    where: { DNI: cliente.DNI }
  });

  if (clienteExistente) {
    idClienteAsignado = clienteExistente.Id;
  } else {
    const nuevoCliente = await this.usuarioDAO.create({
      ...cliente,
      EsCliente: true,
      Activo: true,
      Pwd: 'CLIENTE_SIN_ACCESO'
    }, { transaction: t });
    idClienteAsignado = nuevoCliente.Id;
  }
}

      // Dispositivo
      const nuevoDispositivo = await this.dispositivoClienteDAO.create({
        IMEI: dispositivo.IMEI || null,
        Desbloqueo: dispositivo.Desbloqueo || 'Sin clave',
        Observaciones: dispositivo.Observaciones || 'Sin observaciones.',
        IdModeloArticulo: dispositivo.IdModeloArticulo,
        IdCliente: idClienteAsignado
      }, { transaction: t });

      // Orden
      const nuevaOrden = await this.ordenReparacionDAO.create({
        FechaEmision: sequelize.fn('SYSDATETIME'),
        CostoRepuestos: 0,
        PrecioManoObra: 0,
        TotalReparacion: 0,
        Senia: sena ? sena.Monto : null,
        IdEmpleado: idEmpleadoSesion,
        IdDispositivoCliente: nuevoDispositivo.Id,
        IdEstadoOrden: 1
      }, { transaction: t });

      // Fallas
      if (idsFallas && idsFallas.length > 0) {
        const relacionFallas = idsFallas.map(idFalla => ({
          IdOrdenReparacion: nuevaOrden.Id,
          IdFalla: idFalla
        }));
        await this.ordenFallaDAO.bulkCreate(relacionFallas, { transaction: t });
      }

      // Seña
      if (sena && sena.Monto > 0) {
        const pagoSena = await sequelize.models.PagoReparacion.create({
          Monto: sena.Monto,
          FechaPago: sequelize.fn('SYSDATETIME'),
          Observacion: 'Seña inicial de reparación',
          IdOrdenReparacion: nuevaOrden.Id,
          IdMetodoPago: sena.IdMetodoPago,
          IdTurnoCaja: sena.IdTurnoCaja
        }, { transaction: t });

        if (this.cajaService) {
          await this.cajaService.registrarIngreso({
            IdTurnoCaja: sena.IdTurnoCaja,
            IdEmpleado: idEmpleadoSesion,
            Monto: sena.Monto,
            Descripcion: `Seña de reparación Id=${nuevaOrden.Id}`,
            Fecha: new Date()
          }, { transaction: t });
        }
      }

      // Bitácora inicial
      await this.seguimientoOrdenDAO.create({
        FechaModificacion: sequelize.fn('SYSDATETIME'),
        ObservacionTecnico: observacionIngreso || 'Ingreso del equipo al sistema.',
        IdOrdenReparacion: nuevaOrden.Id,
        IdEmpleado: idEmpleadoSesion,
        IdEstadoOrden: 1
      }, { transaction: t });

      await t.commit();

      await auditar(this.bitacoraService, ctx ?? { IdEmpleado: idEmpleadoSesion },
        `Creó la orden de reparación #${nuevaOrden.Id}`,
        `Cliente ${idClienteAsignado} · dispositivo ${nuevoDispositivo.Id}`);

      return {
        IdOrden: nuevaOrden.Id,
        ClienteId: idClienteAsignado,
        Mensaje: 'Orden generada exitosamente'
      };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async updateStatus(idOrden, datosCambio) {
    const { IdEstadoOrden, ObservacionTecnico, PrecioManoObra, pagoFinal, idEmpleadoSesion, ctx } = datosCambio;
    const t = await sequelize.transaction();

    try {
      const orden = await this.ordenReparacionDAO.getById(idOrden, {
        include: [{
          association: 'dispositivo',
          include: [{ association: 'cliente', attributes: ['Nombre', 'Email'] }]
        }]
      });
      if (!orden) {
        const err = new Error(`La orden número ${idOrden} no existe.`);
        err.statusCode = 404;
        throw err;
      }

      const estadoActual = orden.IdEstadoOrden;
      const nuevoEstado = IdEstadoOrden;

      // Validar transición
      if (estadoActual === nuevoEstado) {
        if (!ObservacionTecnico || ObservacionTecnico.trim() === '') {
          const err = new Error('Para agregar un registro a la bitácora debe incluir una observación.');
          err.statusCode = 400;
          throw err;
        }
      } else {
        const transiciones = { 1: [2, 5], 2: [3, 5], 3: [4], 4: [], 5: [] };
        if (!(transiciones[estadoActual] || []).includes(nuevoEstado)) {
          const err = new Error(`Transición inválida de estado ${estadoActual} a ${nuevoEstado}.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // ANULADO (5)
      if (nuevoEstado === 5) {
        const repuestosAsignados = await sequelize.models.RepuestoOrden.findAll({
          where: { IdOrdenReparacion: idOrden },
          transaction: t
        });

        for (const rep of repuestosAsignados) {
          const itemInv = await sequelize.models.Inventario.findByPk(rep.IdInventario, { transaction: t });
          if (itemInv) await itemInv.increment('Stock', { by: rep.Cantidad, transaction: t });
        }

        await sequelize.models.RepuestoOrden.destroy({
          where: { IdOrdenReparacion: idOrden },
          transaction: t
        });

        await orden.update({
          IdEstadoOrden: 5,
          CostoRepuestos: 0,
          PrecioManoObra: 0,
          TotalReparacion: 0
        }, { transaction: t });

      // TERMINADO (3)
      } else if (nuevoEstado === 3) {
        if (PrecioManoObra === undefined || PrecioManoObra === null || isNaN(Number(PrecioManoObra))) {
          const err = new Error('PrecioManoObra es requerido y debe ser un número válido para marcar la orden como Terminada.');
          err.statusCode = 400;
          throw err;
        }

        // CostoRepuestos ya es USD (hereda de PrecioArticulo.ValorFinal, ver repuesto-orden.service.js);
        // PrecioManoObra debe cargarse en USD desde el frontend por el mismo motivo — de lo
        // contrario esta suma mezclaría monedas sin conversión.
        const costoRepuestos = Number(orden.CostoRepuestos);
        const precioManoObra = Number(PrecioManoObra);
        const senia = Number(orden.Senia || 0);
        const totalReparacion = costoRepuestos + precioManoObra - senia;

        await orden.update({
          IdEstadoOrden: 3,
          PrecioManoObra: precioManoObra,
          TotalReparacion: totalReparacion
        }, { transaction: t });

      // ENTREGADO (4)
      } else if (nuevoEstado === 4) {
        const pagosAnteriores = await sequelize.models.PagoReparacion.sum('Monto', {
          where: { IdOrdenReparacion: idOrden },
          transaction: t
        }) || 0;

        const saldo = Number(orden.TotalReparacion) - Number(pagosAnteriores);

        if (saldo > 0) {
          if (!pagoFinal || !pagoFinal.IdMetodoPago || !pagoFinal.IdTurnoCaja) {
            const err = new Error('Debe registrar el pago final (método de pago y turno de caja) antes de marcar la orden como Entregada, ya que queda un saldo pendiente de ' + saldo.toFixed(2) + '.');
            err.statusCode = 400;
            throw err;
          }
          const pagoFinalCreado = await sequelize.models.PagoReparacion.create({
            Monto: saldo,
            FechaPago: sequelize.fn('SYSDATETIME'),
            Observacion: 'Saldo final al entregar',
            IdOrdenReparacion: idOrden,
            IdMetodoPago: pagoFinal.IdMetodoPago,
            IdTurnoCaja: pagoFinal.IdTurnoCaja
          }, { transaction: t });

          if (this.cajaService) {
            await this.cajaService.registrarIngreso({
              IdTurnoCaja: pagoFinal.IdTurnoCaja,
              IdEmpleado: idEmpleadoSesion,
              Monto: saldo,
              Descripcion: `Pago final de reparación Id=${idOrden}`,
              Fecha: new Date()
            }, { transaction: t });
          }
        }

        await orden.update({
          IdEstadoOrden: 4,
          FechaEntrega: sequelize.fn('SYSDATETIME')
        }, { transaction: t });

      // EN REPARACIÓN (2) u otros
      } else {
        await orden.update({ IdEstadoOrden: nuevoEstado }, { transaction: t });
      }

      // Bitácora
      await this.seguimientoOrdenDAO.create({
        FechaModificacion: sequelize.fn('SYSDATETIME'),
        IdOrdenReparacion: idOrden,
        IdEmpleado: idEmpleadoSesion,
        IdEstadoOrden: nuevoEstado,
        ObservacionTecnico: ObservacionTecnico || 'Actualización de estado.'
      }, { transaction: t });

      await t.commit();

      const estados = { 1: 'En espera', 2: 'En reparación', 3: 'Terminado', 4: 'Entregado', 5: 'Anulado' };
      await auditar(this.bitacoraService, ctx ?? { IdEmpleado: idEmpleadoSesion },
        `Cambió la orden de reparación #${idOrden} a estado "${estados[nuevoEstado] ?? nuevoEstado}"`,
        ObservacionTecnico || 'Actualización de estado');

      if (nuevoEstado !== estadoActual && nuevoEstado !== 4) {
        const email  = orden.dispositivo?.cliente?.Email;
        const nombre = orden.dispositivo?.cliente?.Nombre ?? 'Cliente';
        if (email) {
          this.notificacionService
            .enviarCambioEstado(email, nombre, idOrden, nuevoEstado)
            .catch(err => console.error('❌ Notificación fallida:', err.message));
        }
      }

      return { IdOrden: idOrden, NuevoEstado: nuevoEstado };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getAll(query = {}) {
    const { page, limit, IdEstadoOrden } = query;
    const where = {};
    if (IdEstadoOrden) where.IdEstadoOrden = IdEstadoOrden;

    const options = {
      where,
      include: [
        { association: 'estado', attributes: ['Nombre'] },
        {
          association: 'dispositivo',
          include: [{ association: 'modelo', attributes: ['Nombre'] }]
        },
        { association: 'empleado', attributes: ['Nombre', 'Apellido'] }
      ],
      order: [['FechaEmision', 'DESC']]
    };

    // Con "page" devuelve también el total, para paginar en el front
    if (page) {
      return await this.ordenReparacionDAO.getPage({ page: Number(page), limit: Number(limit) || 10, ...options });
    }
    return await this.ordenReparacionDAO.getAll(options);
  }

  async getById(id) {
    const orden = await this.ordenReparacionDAO.getById(id, {
      include: [
        { association: 'estado' },
        {
          association: 'dispositivo',
          include: [
            { association: 'modelo', include: [{ association: 'marca' }] },
            { association: 'cliente', attributes: ['Nombre', 'Apellido', 'DNI', 'Celular', 'Email'] }
          ]
        },
        {
          association: 'seguimientos',
          include: [{ association: 'empleado', attributes: ['Nombre', 'Apellido'] }]
        },
        {
          association: 'fallas',
          through: { attributes: [] }
        },
        {
          association: 'repuestos',
          include: [{ association: 'inventario' }]
        }
      ]
    });

    if (!orden) {
      const err = new Error(`La orden número ${id} no existe.`);
      err.statusCode = 404;
      throw err;
    }

    return orden;
  }

  async enviarComprobante(idOrden, pdfBase64) {
    const orden = await this.ordenReparacionDAO.getById(idOrden, {
      include: [{
        association: 'dispositivo',
        include: [{ association: 'cliente', attributes: ['Nombre', 'Email'] }]
      }]
    });
    if (!orden) {
      const err = new Error(`La orden número ${idOrden} no existe.`);
      err.statusCode = 404;
      throw err;
    }
    const email  = orden.dispositivo?.cliente?.Email;
    const nombre = orden.dispositivo?.cliente?.Nombre ?? 'Cliente';
    if (!email) {
      const err = new Error('El cliente de esta orden no tiene email registrado.');
      err.statusCode = 422;
      throw err;
    }
    await this.notificacionService.enviarComprobanteEntrega(email, nombre, idOrden, pdfBase64);
    return { enviado: true, destinatario: email };
  }

  async delete(id) {
    const orden = await this.ordenReparacionDAO.getById(id);
    if (!orden) {
      const err = new Error('Orden de reparación no encontrada');
      err.statusCode = 404;
      throw err;
    }
    const eliminado = await this.ordenReparacionDAO.remove(id);
    if (!eliminado) throw new Error('No se pudo eliminar la orden de reparación');
    return true;
  }
}
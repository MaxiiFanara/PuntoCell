import { sequelize } from '../../../models/index.js';
import { auditar } from '../../../core/utils/audit.util.js';
import { reprecificarInventario, resolverListasPrecioCategoria } from '../../../core/utils/precios.util.js';

const ESTADO_TERMINADO = 3;
const ESTADO_ABANDONADO = 6;
const NOMBRE_ESTADO_ABANDONADO = 'Abandonado';
const NOMBRE_PROVEEDOR_CANJE = 'canje de clientes';
const DIAS_ABANDONO = 60;
const DIAS_GARANTIA_LOCAL_POR_DEFECTO = 30;

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

  async procesarOrdenesAbandonadas({ diasInactividad = DIAS_ABANDONO, garantiaLocalDias = DIAS_GARANTIA_LOCAL_POR_DEFECTO, ctx = null } = {}) {
    const models = sequelize.models;
    const ahora = new Date();
    const corte = new Date(ahora);
    corte.setHours(0, 0, 0, 0);
    corte.setDate(corte.getDate() - diasInactividad);

    const estadoAbandonadoExistente = await models.EstadoOrden.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('Nombre')), NOMBRE_ESTADO_ABANDONADO.toLowerCase())
    });

    const estadoAbandonado = estadoAbandonadoExistente || await models.EstadoOrden.create({ Nombre: NOMBRE_ESTADO_ABANDONADO });

    const proveedorCanje = await models.Proveedor.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('Nombre')), NOMBRE_PROVEEDOR_CANJE)
    }) || await models.Proveedor.create({
      Nombre: NOMBRE_PROVEEDOR_CANJE,
      Activo: true
    });

    const ordenesTerminadas = await this.ordenReparacionDAO.model.findAll({
      where: { IdEstadoOrden: ESTADO_TERMINADO },
      include: [
        {
          association: 'dispositivo',
          include: [{ association: 'cliente', attributes: ['Nombre', 'Email'] }]
        },
        { association: 'empleado', attributes: ['Id', 'Nombre', 'Apellido', 'IdSucursal'] },
        {
          association: 'seguimientos',
          attributes: ['Id', 'FechaModificacion', 'IdEstadoOrden'],
          required: false
        }
      ],
      order: [['Id', 'ASC']]
    });

    const resumen = { procesadas: 0, omitidas: 0, errores: 0 };

    for (const orden of ordenesTerminadas) {
      const seguimientosTerminados = (orden.seguimientos || [])
        .filter((seguimiento) => Number(seguimiento.IdEstadoOrden) === ESTADO_TERMINADO)
        .sort((a, b) => new Date(b.FechaModificacion) - new Date(a.FechaModificacion));

      const fechaTerminado = seguimientosTerminados[0]?.FechaModificacion ? new Date(seguimientosTerminados[0].FechaModificacion) : null;
      if (!fechaTerminado) {
        resumen.omitidas += 1;
        continue;
      }

      const fechaTerminadoDia = new Date(fechaTerminado);
      fechaTerminadoDia.setHours(0, 0, 0, 0);
      if (fechaTerminadoDia > corte) {
        resumen.omitidas += 1;
        continue;
      }

      const transaction = await sequelize.transaction();
      try {
        const ordenBloqueada = await this.ordenReparacionDAO.model.findByPk(orden.Id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
          include: [
            {
              association: 'dispositivo',
              include: [{ association: 'cliente', attributes: ['Nombre', 'Email'] }]
            },
            { association: 'empleado', attributes: ['Id', 'Nombre', 'Apellido', 'IdSucursal'] },
            {
              association: 'seguimientos',
              attributes: ['Id', 'FechaModificacion', 'IdEstadoOrden'],
              required: false
            }
          ]
        });

        if (!ordenBloqueada || Number(ordenBloqueada.IdEstadoOrden) !== ESTADO_TERMINADO) {
          await transaction.rollback();
          resumen.omitidas += 1;
          continue;
        }

        const seguimientosBloqueados = (ordenBloqueada.seguimientos || [])
          .filter((seguimiento) => Number(seguimiento.IdEstadoOrden) === ESTADO_TERMINADO)
          .sort((a, b) => new Date(b.FechaModificacion) - new Date(a.FechaModificacion));

        const fechaTerminadoBloqueada = seguimientosBloqueados[0]?.FechaModificacion ? new Date(seguimientosBloqueados[0].FechaModificacion) : null;
        if (!fechaTerminadoBloqueada) {
          await transaction.rollback();
          resumen.omitidas += 1;
          continue;
        }

        const fechaTerminadoBloqueadaDia = new Date(fechaTerminadoBloqueada);
        fechaTerminadoBloqueadaDia.setHours(0, 0, 0, 0);
        if (fechaTerminadoBloqueadaDia > corte) {
          await transaction.rollback();
          resumen.omitidas += 1;
          continue;
        }

        const dispositivo = ordenBloqueada.dispositivo;
        const empleado = ordenBloqueada.empleado;
        const sucursalId = Number(empleado?.IdSucursal || 0);
        if (!dispositivo) {
          throw new Error(`La orden #${ordenBloqueada.Id} no tiene dispositivo asociado.`);
        }
        if (!sucursalId) {
          throw new Error(`La orden #${ordenBloqueada.Id} no tiene sucursal asociada en el empleado responsable.`);
        }

        const articulo = await models.Articulo.findOne({
          where: {
            IdModeloArticulo: dispositivo.IdModeloArticulo,
            EsVendible: true,
            Activo: true
          },
          order: [['Id', 'ASC']],
          transaction
        });

        if (!articulo) {
          throw new Error(`No se encontró un Articulo vendible para el modelo ${dispositivo.IdModeloArticulo} de la orden #${ordenBloqueada.Id}.`);
        }

        const modeloArticulo = await models.ModeloArticulo.findByPk(articulo.IdModeloArticulo, { transaction });
        if (!modeloArticulo) {
          throw new Error(`No se encontró el ModeloArticulo asociado al articulo ${articulo.Id} de la orden #${ordenBloqueada.Id}.`);
        }

        const garantiaLocal = new Date(ahora);
        garantiaLocal.setDate(garantiaLocal.getDate() + garantiaLocalDias);

        const observaciones = `Ingreso automático por abandono de reparación #${ordenBloqueada.Id}`;
        const costoBase = Math.max(1, Number(ordenBloqueada.TotalReparacion || ordenBloqueada.CostoRepuestos || 0));

        let inventario = null;
        if (dispositivo.IMEI) {
          inventario = await models.Inventario.findOne({
            where: { IMEI: dispositivo.IMEI },
            transaction,
            lock: transaction.LOCK.UPDATE
          });
        }

        if (inventario) {
          await inventario.update({
            IdArticulo: articulo.Id,
            Stock: 1,
            IdEstadoInventario: 1,
            IdSucursal: sucursalId,
            IdProveedor: proveedorCanje.Id,
            MesesGarantiaLocal: garantiaLocal,
            Observaciones: observaciones,
            CreatedAt: inventario.CreatedAt || ahora
          }, { transaction });
        } else {
          inventario = await models.Inventario.create({
            IMEI: dispositivo.IMEI || null,
            Stock: 1,
            CreatedAt: ahora,
            MesesGarantiaMarca: null,
            MesesGarantiaLocal: garantiaLocal,
            Observaciones: observaciones,
            IdSucursal: sucursalId,
            IdArticulo: articulo.Id,
            IdEstadoInventario: 1,
            IdProveedor: proveedorCanje.Id,
            IdColor: dispositivo.IdColor || null,
            IdMemoria: dispositivo.IdMemoria || null,
            IdBateria: dispositivo.IdBateria || null,
            IdAlmacenamiento: dispositivo.IdAlmacenamiento || null
          }, { transaction });
        }

        const listas = await resolverListasPrecioCategoria(sequelize, modeloArticulo.IdCategoriaArticulo, transaction);
        await reprecificarInventario(sequelize, {
          IdInventario: inventario.Id,
          CostoBase: costoBase,
          listas
        }, transaction);

        await models.MovimientoStock.create({
          Fecha: ahora,
          TipoMovimiento: 'Ingreso por Abandono de Reparación',
          Cantidad: 1,
          Observaciones: observaciones,
          IdInventario: inventario.Id,
          IdEmpleado: ordenBloqueada.IdEmpleado
        }, { transaction });

        await ordenBloqueada.update({ IdEstadoOrden: estadoAbandonado.Id }, { transaction });

        await models.SeguimientoOrden.create({
          FechaModificacion: ahora,
          ObservacionTecnico: observaciones,
          IdOrdenReparacion: ordenBloqueada.Id,
          IdEmpleado: ordenBloqueada.IdEmpleado,
          IdEstadoOrden: estadoAbandonado.Id
        }, { transaction });

        await transaction.commit();
        resumen.procesadas += 1;

        await auditar(
          this.bitacoraService,
          ctx ?? { IdEmpleado: ordenBloqueada.IdEmpleado, IdSucursal: sucursalId },
          `Marcó la orden de reparación #${ordenBloqueada.Id} como abandonada y la reingresó al inventario`,
          `Inventario ${inventario.Id} · IMEI ${dispositivo.IMEI || 'N/D'}`
        ).catch(() => {});

        const email = ordenBloqueada.dispositivo?.cliente?.Email;
        const nombre = ordenBloqueada.dispositivo?.cliente?.Nombre ?? 'Cliente';
        if (email) {
          this.notificacionService
            .enviarCambioEstado(email, nombre, ordenBloqueada.Id, estadoAbandonado.Id)
            .catch((err) => console.error(`❌ No se pudo notificar el abandono de la orden #${ordenBloqueada.Id}:`, err.message));
        }
      } catch (error) {
        await transaction.rollback();
        resumen.errores += 1;
        console.error(`❌ Error al procesar la orden abandonada #${orden.Id}:`, error.message);
      }
    }

    return resumen;
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
        const transiciones = { 1: [2, 5], 2: [3, 5], 3: [4, 6], 4: [], 5: [], 6: [] };
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

      // ABANDONADO (6)
      } else if (nuevoEstado === 6) {
        await orden.update({
          IdEstadoOrden: 6
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

      const estados = { 1: 'En espera', 2: 'En reparación', 3: 'Terminado', 4: 'Entregado', 5: 'Anulado', 6: 'Abandonado' };
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
          include: [
            { association: 'modelo', attributes: ['Nombre'] },
            { association: 'cliente', attributes: ['Nombre', 'Apellido', 'DNI'] }
          ]
        },
        { association: 'empleado', attributes: ['Nombre', 'Apellido'] },
        {
          association: 'fallas',
          through: { attributes: [] },
          attributes: ['Id', 'Nombre']
        }
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
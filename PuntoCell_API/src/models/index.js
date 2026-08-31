import Database from '../core/db/database.js';
import { setupAssociations } from './associations.js';

import localidadModel from '../modules/usuarios-empresa/localidad/localidad.model.js';
import usuarioModel from '../modules/usuarios-empresa/usuario/usuario.model.js';
import rolModel from '../modules/usuarios-empresa/rol/rol.model.js';
import permisoModel from '../modules/usuarios-empresa/permiso/permiso.model.js';
import rolPermisoModel from '../modules/usuarios-empresa/rol-permiso/rol-permiso.model.js';
import sucursalModel from '../modules/usuarios-empresa/sucursal/sucursal.model.js';

import estadoOrdenModel from '../modules/reparaciones/estado-orden/estado-orden.model.js';
import fallaModel from '../modules/reparaciones/falla/falla.model.js';
import dispositivoClienteModel from '../modules/reparaciones/dispositivo-cliente/dispositivo-cliente.model.js';
import ordenReparacionModel from '../modules/reparaciones/orden-reparacion/orden-reparacion.model.js';
import ordenFallaModel from '../modules/reparaciones/orden-falla/orden-falla.model.js';
import seguimientoOrdenModel from '../modules/reparaciones/seguimiento-orden/seguimiento-orden.model.js';
import pagoReparacionModel from '../modules/reparaciones/pago-reparacion/pago-reparacion.model.js';
import repuestoOrdenModel from '../modules/reparaciones/repuesto-orden/repuesto-orden.model.js';

// Importaciones del módulo de compras
import proveedorModel from '../modules/compras/proveedor/proveedor.model.js';
import compraModel from '../modules/compras/compra/compra.model.js';
import detalleCompraModel from '../modules/compras/detalle-compra/detalle-compra.model.js';
import detalleDevolucionCompraModel from '../modules/compras/detalle-devolucion-compra/detalle-devolucion-compra.model.js';
import devolucionCompraModel from '../modules/compras/devolucion-compra/devolucion-compra.model.js';
import pagoCompraModel from '../modules/compras/pago-compra/pago-compra.model.js';
import cuentaCorrienteProveedorModel from '../modules/compras/cuenta-corriente-proveedor/cuenta-corriente-proveedor.model.js';
import bateriaModel from '../modules/inventario/bateria/bateria.model.js';
import colorModel from '../modules/inventario/color/color.model.js';
import estadoInventarioModel from '../modules/inventario/estado-inventario/estado-inventario.model.js';
import categoriaArticuloModel from '../modules/inventario/categoria-articulo/categoria-articulo.model.js';
import marcaArticuloModel from '../modules/inventario/marca-articulo/marca-articulo.model.js';
import memoriaModel from '../modules/inventario/memoria/memoria.model.js';
import modeloArticuloModel from '../modules/inventario/modelo-articulo/modelo-articulo.model.js';
import almacenamientoModel from '../modules/inventario/almacenamiento/almacenamiento.model.js';
import articuloModel from '../modules/inventario/articulo/articulo.model.js';
import inventarioModel from '../modules/inventario/inventario/inventario.model.js';
import movimientoStockModel from '../modules/inventario/movimiento-stock/movimiento-stock.model.js';
import transferenciaModel from '../modules/inventario/transferencia/transferencia.model.js';
import listaPrecioModel from '../modules/precios/lista-de-precios/lista-de-precios.model.js';
import precioArticuloModel from '../modules/precios/precios-articulos/precios-articulos.model.js';

// Modelos de solo lectura mapeados a las vistas de estadísticas
import metricaMarcaReparadaModel from '../modules/estadisticas/marca-reparada.model.js';
import metricaDispositivoReparadoModel from '../modules/estadisticas/dispositivo-reparado.model.js';
import metricaRepuestoUsadoModel from '../modules/estadisticas/repuesto-usado.model.js';
import metricaFallaRepetidaModel from '../modules/estadisticas/falla-repetida.model.js';
import finanzasResumenModel from '../modules/estadisticas/finanzas-resumen.model.js';

// Módulo Ventas
import cotizacionModel from '../modules/ventas/cotizacion/cotizacion.model.js';
import descuentoModel from '../modules/ventas/descuento/descuento.model.js';
import estadoReclamoModel from '../modules/ventas/estado-reclamo/estado-reclamo.model.js';
import devolucionVentaModel from '../modules/ventas/devolucion-venta/devolucion-venta.model.js';
import detalleDevolucionVentaModel from '../modules/ventas/detalle-devolucion-venta/detalle-devolucion-venta.model.js';
import detalleVentaModel from '../modules/ventas/detalle-venta/detalle-venta.model.js';
import ventaModel from '../modules/ventas/venta/venta.model.js';
import cuotaModel from '../modules/ventas/cuota/cuota.model.js';
import pagoVentaModel from '../modules/ventas/pago-venta/pago-venta.model.js';
import reclamoGarantiaModel from '../modules/ventas/reclamo-garantia/reclamo-garantia.model.js';

// Módulo Finanzas
import metodoPagoModel from '../modules/finanzas/metodo-pago/metodo-pago.model.js';

// Módulo Caja
import turnoCajaModel from '../modules/caja/turno-caja/turno-caja.model.js';
import movimientoCajaModel from '../modules/caja/movimiento-caja/movimiento-caja.model.js';

// Módulo Auditoría
import accionModel from '../modules/auditoria/accion/accion.model.js';
import bitacoraModel from '../modules/auditoria/bitacora/bitacora.model.js';

export const sequelize = Database.getInstance().getConnection();

export const models = {
  Localidad: localidadModel(sequelize),
  Usuario: usuarioModel(sequelize),
  Rol: rolModel(sequelize),
  Permiso: permisoModel(sequelize),
  RolPermiso: rolPermisoModel(sequelize),
  Sucursal: sucursalModel(sequelize),
  
  EstadoOrden: estadoOrdenModel(sequelize),
  Falla: fallaModel(sequelize),
  DispositivoCliente: dispositivoClienteModel(sequelize),
  OrdenReparacion: ordenReparacionModel(sequelize),
  OrdenFalla: ordenFallaModel(sequelize),
  SeguimientoOrden: seguimientoOrdenModel(sequelize),
  PagoReparacion: pagoReparacionModel(sequelize),
  RepuestoOrden: repuestoOrdenModel(sequelize),

  Proveedor: proveedorModel(sequelize),
  Compra: compraModel(sequelize),
  DetalleCompra: detalleCompraModel(sequelize),
  DetalleDevolucionCompra: detalleDevolucionCompraModel(sequelize),
  DevolucionCompra: devolucionCompraModel(sequelize),
  PagoCompra: pagoCompraModel(sequelize)
  ,
  CuentaCorrienteProveedor: cuentaCorrienteProveedorModel(sequelize)
  ,
  Bateria: bateriaModel(sequelize)
  ,
  Color: colorModel(sequelize)
  ,
  EstadoInventario: estadoInventarioModel(sequelize)
  ,
  CategoriaArticulo: categoriaArticuloModel(sequelize)
  ,
  MarcaArticulo: marcaArticuloModel(sequelize)
  ,
  Memoria: memoriaModel(sequelize)
  ,
  ModeloArticulo: modeloArticuloModel(sequelize)
  ,
  Almacenamiento: almacenamientoModel(sequelize)
  ,
  Articulo: articuloModel(sequelize)
  ,
  Inventario: inventarioModel(sequelize)
  ,
  MovimientoStock: movimientoStockModel(sequelize)
  ,
  Transferencia: transferenciaModel(sequelize)
  ,
  ListaPrecio: listaPrecioModel(sequelize)
  ,
  PrecioArticulo: precioArticuloModel(sequelize)
  ,
  // Vistas de estadísticas (solo lectura)
  MetricaMarcaReparada: metricaMarcaReparadaModel(sequelize)
  ,
  MetricaDispositivoReparado: metricaDispositivoReparadoModel(sequelize)
  ,
  MetricaRepuestoUsado: metricaRepuestoUsadoModel(sequelize)
  ,
  MetricaFallaRepetida: metricaFallaRepetidaModel(sequelize)
  ,
  FinanzasResumen: finanzasResumenModel(sequelize)
  ,
  // Módulo Ventas
  Cotizacion: cotizacionModel(sequelize)
  ,
  Descuento: descuentoModel(sequelize)
  ,
  EstadoReclamo: estadoReclamoModel(sequelize)
  ,
  DetalleVenta: detalleVentaModel(sequelize)
  ,
  Venta: ventaModel(sequelize)
  ,
  DevolucionVenta: devolucionVentaModel(sequelize)
  ,
  DetalleDevolucionVenta: detalleDevolucionVentaModel(sequelize)
  ,
  Cuota: cuotaModel(sequelize)
  ,
  PagoVenta: pagoVentaModel(sequelize)
  ,
  ReclamoGarantia: reclamoGarantiaModel(sequelize)
  ,
  // Módulo Finanzas
  MetodoPago: metodoPagoModel(sequelize)
  ,
  // Módulo Caja
  TurnoCaja: turnoCajaModel(sequelize)
  ,
  MovimientoCaja: movimientoCajaModel(sequelize)
  ,
  // Módulo Auditoría
  Accion: accionModel(sequelize)
  ,
  Bitacora: bitacoraModel(sequelize)

};

setupAssociations(models);

export default models;
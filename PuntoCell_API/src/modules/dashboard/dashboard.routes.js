import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();
  const {
    dashboardController,
    comprasDashboardController,
    reparacionesDashboardController,
    finanzasDashboardController,
    inventarioDashboardController,
    auditoriaDashboardController,
  } = container.dashboard;

  // Resumen general
  router.get('/summary', requireAuth, dashboardController.resumen);

  // Ventas
  router.get('/ventas/evolucion', requireAuth, dashboardController.evolucionVentas);
  router.get('/ventas/categoria', requireAuth, dashboardController.ventasPorCategoria);
  router.get('/ventas/pareto', requireAuth, dashboardController.paretoProductos);
  router.get('/ventas/dispersion', requireAuth, dashboardController.dispersionPrecioCantidad);
  router.get('/ventas/elasticidad', requireAuth, dashboardController.elasticidadPrecioDemanda);
  router.get('/ventas/forma-pago', requireAuth, dashboardController.ventasPorFormaPago);
  router.get('/ventas/sucursal', requireAuth, dashboardController.ventasPorSucursal);
  router.get('/ventas/proyeccion', requireAuth, dashboardController.proyeccionDemanda);

  // Compras
  router.get('/compras/evolucion-costo', requireAuth, comprasDashboardController.evolucionCostoCompras);
  router.get('/compras/proveedores', requireAuth, comprasDashboardController.comprasPorProveedor);
  router.get('/compras/ranking-proveedores', requireAuth, comprasDashboardController.rankingProveedores);
  router.get('/compras/evolucion-precio', requireAuth, comprasDashboardController.evolucionPrecioProducto);
  router.get('/compras/variacion-precio-proveedor', requireAuth, comprasDashboardController.variacionPrecioProveedor);
  router.get('/compras/abc', requireAuth, comprasDashboardController.abcCompras);
  router.get('/compras/punto-reposicion', requireAuth, comprasDashboardController.puntoReposicion);
  router.get('/compras/stock-seguridad', requireAuth, comprasDashboardController.stockSeguridad);
  router.get('/compras/eoq', requireAuth, comprasDashboardController.eoq);

  // Inventario
  router.get('/inventario/baja-rotacion', requireAuth, inventarioDashboardController.productosBajaRotacion);

  // Reparaciones
  router.get('/reparaciones/evolucion', requireAuth, reparacionesDashboardController.reparacionesPorPeriodo);
  router.get('/reparaciones/tipo', requireAuth, reparacionesDashboardController.reparacionesPorTipo);
  router.get('/reparaciones/marca', requireAuth, reparacionesDashboardController.reparacionesPorMarca);
  router.get('/reparaciones/heatmap', requireAuth, reparacionesDashboardController.heatmapMarcaFalla);
  router.get('/reparaciones/pareto-fallas', requireAuth, reparacionesDashboardController.paretoFallas);
  router.get('/reparaciones/tiempos', requireAuth, reparacionesDashboardController.tiemposReparacion);
  router.get('/reparaciones/rentabilidad', requireAuth, reparacionesDashboardController.rentabilidadPorFalla);

  // Finanzas
  router.get('/finanzas/ingresos-egresos', requireAuth, finanzasDashboardController.ingresosEgresos);
  router.get('/finanzas/margen-bruto', requireAuth, finanzasDashboardController.margenBruto);
  router.get('/finanzas/margen-producto', requireAuth, finanzasDashboardController.margenPorProducto);
  router.get('/finanzas/margen-categoria', requireAuth, finanzasDashboardController.margenPorCategoria);
  router.get('/finanzas/rentabilidad-marca', requireAuth, finanzasDashboardController.rentabilidadPorMarca);

  // Control / auditoría
  router.get('/control/empleado-operacion', requireAuth, auditoriaDashboardController.empleadoOperacion);

  return router;
};

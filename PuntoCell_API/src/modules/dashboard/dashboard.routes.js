import { Router } from 'express';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();
  const { dashboardController } = container.dashboard;

  // General summary endpoint
  router.get('/summary', requireAuth, dashboardController.resumen);

  // Ventas - Evolución (Time Series)
  router.get('/ventas/evolucion', requireAuth, dashboardController.evolucionVentas);

  // Ventas - Por categoría (Bar/Column)
  router.get('/ventas/categoria', requireAuth, dashboardController.ventasPorCategoria);

  // Ventas - Pareto de productos
  router.get('/ventas/pareto', requireAuth, dashboardController.paretoProductos);

  // Ventas - Dispersión precio vs cantidad (Scatter)
  router.get('/ventas/dispersion', requireAuth, dashboardController.dispersionPrecioCantidad);

  // Ventas - Elasticidad precio-demanda
  router.get('/ventas/elasticidad', requireAuth, dashboardController.elasticidadPrecioDemanda);

  // Ventas - Por forma de pago (stacked/donut)
  router.get('/ventas/forma-pago', requireAuth, dashboardController.ventasPorFormaPago);

  // Ventas - Por sucursal (comparative)
  router.get('/ventas/sucursal', requireAuth, dashboardController.ventasPorSucursal);

  // Ventas - Proyección de demanda y elasticidad
  router.get('/ventas/proyeccion', requireAuth, dashboardController.proyeccionDemanda);

  return router;
};

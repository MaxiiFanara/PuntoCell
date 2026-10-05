import { Router } from 'express';
import { requireAuth } from '../core/middlewares/auth.middleware.js';

// Importación de módulos
import authRoutes from '../modules/auth/auth.routes.js';
import usuariosEmpresaRoutes from '../modules/usuarios-empresa/usuarios.routes.js';
import reparacionesRoutes from '../modules/reparaciones/reparaciones.routes.js';
import comprasRoutes from '../modules/compras/compras.routes.js';
import inventarioRoutes from '../modules/inventario/inventario.routes.js';
import preciosRoutes from '../modules/precios/precios.routes.js';
import estadisticasRoutes from '../modules/estadisticas/estadisticas.routes.js';
import ventasRoutes from '../modules/ventas/ventas.routes.js';
import finanzasRoutes from '../modules/finanzas/finanzas.routes.js';
import cajaRoutes from '../modules/caja/caja.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import reportesRoutes from '../modules/reportes/reportes.routes.js';
import catalogoRoutes from '../modules/catalogo/catalogo.routes.js';
import auditoriaRoutes from '../modules/auditoria/auditoria.routes.js';
import pagosRoutes from '../modules/pagos/pagos.routes.js';
import asistenteTecnicoRoutes from '../modules/asistente-tecnico/asistente-tecnico.routes.js';
import asistenteUsuarioRoutes from '../modules/asistente-usuario/asistente-usuario.routes.js';

export default (container) => {
  const router = Router();

  // Rutas públicas: login y recuperación de contraseña deben ser accesibles sin token
  router.use('/auth', authRoutes(container));
  // Catálogo online: solo lectura, sin datos sensibles (ver catalogo.service.js)
  router.use('/catalogo', catalogoRoutes());
  // Pagos del catálogo online: público por el mismo motivo que /catalogo.
  router.use('/pagos', pagosRoutes());

  // Rutas privadas
  router.use(requireAuth);

  router.use('/usuarios', usuariosEmpresaRoutes(container));
  router.use('/reparaciones', reparacionesRoutes(container));
  router.use('/compras', comprasRoutes(container));
  router.use('/inventario', inventarioRoutes(container));
  router.use('/precios', preciosRoutes(container));
  router.use('/estadisticas', estadisticasRoutes(container));
  router.use('/caja', cajaRoutes(container));
  router.use('/dashboard', dashboardRoutes(container));
  router.use('/ventas', ventasRoutes(container));
  router.use('/finanzas', finanzasRoutes(container));
  router.use('/auditoria', auditoriaRoutes(container));
  router.use('/reportes', reportesRoutes(container));
  router.use('/asistente-tecnico', asistenteTecnicoRoutes(container));
  router.use('/asistente-usuario', asistenteUsuarioRoutes(container));

  return router;
};
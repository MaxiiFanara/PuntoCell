import { Router } from 'express';
import { isAdmin, isAnalista } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();
  const { bitacoraController, informeOperativoController } = container.auditoria;
  const { auditoriaDashboardController } = container.dashboard;

  // Bitácora (auditoría): listado para el front. La creación es siempre interna
  // desde el backend (registerAudit), nunca por API.
  router.get('/bitacoras', isAdmin, bitacoraController.getAll);

  // Informe técnico de logs internos: exclusivo del usuario analista (ni administrador ni owner)
  router.get('/informe-operativo', isAnalista, informeOperativoController.get);

  // Analíticas - Auditoría
  router.get('/analitica/empleado-operacion', auditoriaDashboardController.empleadoOperacion);

  return router;
};

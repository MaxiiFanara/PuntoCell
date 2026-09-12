import { Router } from 'express';

export default (container) => {
  const router = Router();
  const { bitacoraController } = container.auditoria;
  const { auditoriaDashboardController } = container.dashboard;

  // Bitácora (auditoría): listado para el front. La creación es siempre interna
  // desde el backend (registerAudit), nunca por API.
  router.get('/bitacoras', bitacoraController.getAll);

  // Analíticas - Auditoría
  router.get('/analitica/empleado-operacion', auditoriaDashboardController.empleadoOperacion);

  return router;
};

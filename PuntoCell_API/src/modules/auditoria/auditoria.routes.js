import { Router } from 'express';

export default (container) => {
  const router = Router();
  const { bitacoraController } = container.auditoria;

  // Bitácora (auditoría): listado para el front. La creación es siempre interna
  // desde el backend (registerAudit), nunca por API.
  router.get('/bitacoras', bitacoraController.getAll);

  return router;
};

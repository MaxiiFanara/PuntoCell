import { Router } from 'express';
import { isAdmin } from '../../core/middlewares/auth.middleware.js';

export default (container) => {
  const router = Router();

  const { estadisticasController } = container.estadisticas;

  // Métricas operativas (cualquier usuario autenticado).
  // ?limit=N -> top N; sin limit -> ranking completo.
  router.get('/marca-mas-reparada', estadisticasController.marcasReparadas);
  router.get('/dispositivo-mas-reparado', estadisticasController.dispositivosReparados);
  router.get('/repuesto-mas-usado', estadisticasController.repuestosUsados);
  router.get('/falla-mas-repetida', estadisticasController.fallasRepetidas);

  // Métricas financieras: solo Admin / Encargado (datos sensibles de dinero).
  router.get('/finanzas', isAdmin, estadisticasController.finanzas);
  router.get('/dashboard', isAdmin, estadisticasController.dashboard);

  return router;
};

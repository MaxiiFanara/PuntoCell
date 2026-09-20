import { Router } from 'express';

export default (container) => {
  const router = Router();
  const { cajaController } = container.caja;

  router.get('/movimientos', cajaController.getMovimientos);
  router.get('/resumen', cajaController.getResumen);
  router.get('/turnos/:idTurnoCaja/movimientos', cajaController.getMovimientosPorTurno);
  router.get('/turnos/:idTurnoCaja/resumen', cajaController.getResumenPorTurno);

  return router;
};
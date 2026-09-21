import { Router } from 'express';

export default (container) => {
  const router = Router();
  const { cajaController } = container.caja;

  router.get('/movimientos', cajaController.getMovimientos);
  router.get('/resumen', cajaController.getResumen);
  router.get('/turnos/:idTurnoCaja/movimientos', cajaController.getMovimientosPorTurno);
  router.get('/turnos/:idTurnoCaja/resumen', cajaController.getResumenPorTurno);
  router.get('/turno-actual', cajaController.getTurnoActual);
  router.post('/abrir', cajaController.abrirTurno);
  router.post('/cerrar', cajaController.cerrarTurno);
  router.post('/movimientos', cajaController.registrarMovimientoManual);

  return router;
};
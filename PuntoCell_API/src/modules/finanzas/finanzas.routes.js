import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { metodoPagoSchema, metodoPagoUpdateSchema } from './metodo-pago/metodo-pago.dto.js';

export default (container) => {
  const router = Router();
  const { metodoPagoController } = container.finanzas;
  const { finanzasDashboardController } = container.dashboard;

  router.get('/metodo-pagos', metodoPagoController.getAll);
  router.get('/metodo-pagos/:id', metodoPagoController.getById);
  router.post('/metodo-pagos', validateFields(metodoPagoSchema), metodoPagoController.create);
  router.put('/metodo-pagos/:id', validateFields(metodoPagoUpdateSchema), metodoPagoController.update);
  router.delete('/metodo-pagos/:id', metodoPagoController.remove);

  // Analíticas - Finanzas
  router.get('/analitica/ingresos-egresos', finanzasDashboardController.ingresosEgresos);
  router.get('/analitica/margen-bruto', finanzasDashboardController.margenBruto);
  router.get('/analitica/margen-producto', finanzasDashboardController.margenPorProducto);
  router.get('/analitica/margen-categoria', finanzasDashboardController.margenPorCategoria);
  router.get('/analitica/rentabilidad-marca', finanzasDashboardController.rentabilidadPorMarca);

  return router;
};

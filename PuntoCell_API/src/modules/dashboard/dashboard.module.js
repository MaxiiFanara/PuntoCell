import { sequelize } from '../../models/index.js';

import DashboardDAO from './dashboard.dao.js';
import DashboardService from './dashboard.service.js';
import DashboardController from './dashboard.controller.js';
import dashboardModel from './dashboard.model.js';
import ComprasDashboardService from './compras/compras-dashboard.service.js';
import ComprasDashboardController from './compras/compras-dashboard.controller.js';
import ReparacionesDashboardService from './reparaciones/reparaciones-dashboard.service.js';
import ReparacionesDashboardController from './reparaciones/reparaciones-dashboard.controller.js';
import FinanzasDashboardService from './finanzas/finanzas-dashboard.service.js';
import FinanzasDashboardController from './finanzas/finanzas-dashboard.controller.js';
import InventarioDashboardService from './inventario/inventario-dashboard.service.js';
import InventarioDashboardController from './inventario/inventario-dashboard.controller.js';
import AuditoriaDashboardService from './auditoria/auditoria-dashboard.service.js';
import AuditoriaDashboardController from './auditoria/auditoria-dashboard.controller.js';

export function createDashboardModule(bitacoraService = null) {
  const dashboardDAO = new DashboardDAO(dashboardModel(sequelize));
  const service = new DashboardService(dashboardDAO, bitacoraService);
  const dashboardController = new DashboardController(service);

  // Sub-dashboard modules
  const comprasDashboardService = new ComprasDashboardService(bitacoraService);
  const comprasDashboardController = new ComprasDashboardController(comprasDashboardService);

  const reparacionesDashboardService = new ReparacionesDashboardService(bitacoraService);
  const reparacionesDashboardController = new ReparacionesDashboardController(reparacionesDashboardService);

  const finanzasDashboardService = new FinanzasDashboardService(bitacoraService);
  const finanzasDashboardController = new FinanzasDashboardController(finanzasDashboardService);

  const inventarioDashboardService = new InventarioDashboardService(bitacoraService);
  const inventarioDashboardController = new InventarioDashboardController(inventarioDashboardService);

  const auditoriaDashboardService = new AuditoriaDashboardService(bitacoraService);
  const auditoriaDashboardController = new AuditoriaDashboardController(auditoriaDashboardService);

  return { dashboardController, comprasDashboardController, reparacionesDashboardController, finanzasDashboardController, inventarioDashboardController, auditoriaDashboardController };
}

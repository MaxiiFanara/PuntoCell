import {models} from '../../models/index.js';
import UsuarioDAO from '../../modules/usuarios-empresa/usuario/usuario.dao.js';

import { createUsuariosEmpresaModule } from '../../modules/usuarios-empresa/usuarios-empresa.module.js';
import { createReparacionesModule } from '../../modules/reparaciones/reparaciones.module.js';
import { createComprasModule } from '../../modules/compras/compras.module.js';
import { createInventarioModule } from '../../modules/inventario/inventario.module.js';
import { createAuthModule } from '../../modules/auth/auth.module.js';
import { createEstadisticasModule } from '../../modules/estadisticas/estadisticas.module.js';
import { createVentasModule } from '../../modules/ventas/ventas.module.js';
import { createFinanzasModule } from '../../modules/finanzas/finanzas.module.js';
import { createAuditoriaModule } from '../../modules/auditoria/auditoria.module.js';
import { createPreciosModule } from '../../modules/precios/precios.module.js';
import { createDashboardModule } from '../../modules/dashboard/dashboard.module.js';
import { createReportesModule } from '../../modules/reportes/reportes.module.js';

export function createContainer() {
  const usuarioDAO = new UsuarioDAO(models.Usuario);
  // Crear módulo de auditoría primero para pasar su servicio a otros módulos
  const auditoriaModule = createAuditoriaModule();

  return {
    usuariosEmpresa: createUsuariosEmpresaModule(usuarioDAO, auditoriaModule.bitacoraService),
    reparaciones: createReparacionesModule(usuarioDAO, auditoriaModule.bitacoraService),
    compras: createComprasModule(auditoriaModule.bitacoraService),
    auth: createAuthModule(usuarioDAO, auditoriaModule.bitacoraService),
    inventario: createInventarioModule(auditoriaModule.bitacoraService),
    precios: createPreciosModule(auditoriaModule.bitacoraService),
    estadisticas: createEstadisticasModule(),
    dashboard: createDashboardModule(auditoriaModule.bitacoraService),
    reportes: createReportesModule(auditoriaModule.bitacoraService),
    ventas: createVentasModule(auditoriaModule.bitacoraService),
    finanzas: createFinanzasModule(auditoriaModule.bitacoraService),
    auditoria: auditoriaModule
  };
}
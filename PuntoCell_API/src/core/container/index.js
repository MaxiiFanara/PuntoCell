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

export function createContainer() {
  const usuarioDAO = new UsuarioDAO(models.Usuario);

  return {
    usuariosEmpresa: createUsuariosEmpresaModule(usuarioDAO),
    reparaciones: createReparacionesModule(usuarioDAO),
    compras: createComprasModule(),
    auth: createAuthModule(usuarioDAO),
    inventario: createInventarioModule(),
    estadisticas: createEstadisticasModule(),
    ventas: createVentasModule(),
    finanzas: createFinanzasModule()
  };
}
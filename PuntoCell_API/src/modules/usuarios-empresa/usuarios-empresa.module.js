import  models  from '../../models/index.js';

import NotificacionService from '../notificaciones/notificacion.service.js';

import LocalidadDAO from './localidad/localidad.dao.js';
import LocalidadService from './localidad/localidad.service.js';
import LocalidadController from './localidad/localidad.controller.js';

import UsuarioService from './usuario/usuario.service.js';
import UsuarioController from './usuario/usuario.controller.js';

import RolDAO from './rol/rol.dao.js';
import RolService from './rol/rol.service.js';
import RolController from './rol/rol.controller.js';

import PermisoDAO from './permiso/permiso.dao.js';
import PermisoService from './permiso/permiso.service.js';
import PermisoController from './permiso/permiso.controller.js';

import RolPermisoDAO from './rol-permiso/rol-permiso.dao.js';
import RolPermisoService from './rol-permiso/rol-permiso.service.js';
import RolPermisoController from './rol-permiso/rol-permiso.controller.js';

import SucursalDAO from './sucursal/sucursal.dao.js';
import SucursalService from './sucursal/sucursal.service.js';
import SucursalController from './sucursal/sucursal.controller.js';

export function createUsuariosEmpresaModule(usuarioDAO) {
  const notificacionService = new NotificacionService();

  const localidadDAO = new LocalidadDAO(models.Localidad);
  const localidadService = new LocalidadService(localidadDAO);
  const localidadController = new LocalidadController(localidadService);

  const usuarioService = new UsuarioService(usuarioDAO, notificacionService);
  const usuarioController = new UsuarioController(usuarioService);

  const rolDAO = new RolDAO(models.Rol);
  const rolService = new RolService(rolDAO);
  const rolController = new RolController(rolService);

  const permisoDAO = new PermisoDAO(models.Permiso);
  const permisoService = new PermisoService(permisoDAO);
  const permisoController = new PermisoController(permisoService);

  const rolPermisoDAO = new RolPermisoDAO(models.RolPermiso);
  const rolPermisoService = new RolPermisoService(rolPermisoDAO);
  const rolPermisoController = new RolPermisoController(rolPermisoService);

  const sucursalDAO = new SucursalDAO(models.Sucursal);
  const sucursalService = new SucursalService(sucursalDAO);
  const sucursalController = new SucursalController(sucursalService);

  return {
    localidadController,
    usuarioController,
    rolController,
    permisoController,
    rolPermisoController,
    sucursalController
  };
}
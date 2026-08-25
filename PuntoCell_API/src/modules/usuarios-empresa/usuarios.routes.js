import { Router } from 'express';
import { validateFields } from '../../core/middlewares/validateFields.middleware.js';
import { localidadSchema, localidadUpdateSchema } from './localidad/localidad.dto.js';
import { usuarioSchema, usuarioUpdateSchema } from './usuario/usuario.dto.js';
import { rolSchema, rolUpdateSchema } from './rol/rol.dto.js';
import { permisoSchema, permisoUpdateSchema } from './permiso/permiso.dto.js';
import { rolPermisoSchema } from './rol-permiso/rol-permiso.dto.js';
import { sucursalSchema, sucursalUpdateSchema } from './sucursal/sucursal.dto.js';

export default (container) => {
  const router = Router();

  const { 
    localidadController, 
    usuarioController, 
    rolController, 
    permisoController,
    rolPermisoController,
    sucursalController
  } = container.usuariosEmpresa;

  // Localidad
  router.get('/localidades', localidadController.getAll);
  router.get('/localidades/:id', localidadController.getById);
  router.post('/localidades', validateFields(localidadSchema), localidadController.create);
  router.put('/localidades/:id', validateFields(localidadUpdateSchema), localidadController.update);
  router.delete('/localidades/:id', localidadController.remove);

// Usuario (list/create sin :id, no colisionan)
  router.get('/', usuarioController.getAll);
  router.post('/',validateFields(usuarioSchema), usuarioController.create);

  // Rol
  router.get('/roles', rolController.getAll);
  router.get('/roles/:id', rolController.getById);
  router.post('/roles', validateFields(rolSchema), rolController.create);
  router.put('/roles/:id', validateFields(rolUpdateSchema), rolController.update);
  router.delete('/roles/:id', rolController.delete);

  // Permiso
  router.get('/permisos', permisoController.getAll);
  router.get('/permisos/:id', permisoController.getById);
  router.post('/permisos', validateFields(permisoSchema), permisoController.create);
  router.put('/permisos/:id', validateFields(permisoUpdateSchema), permisoController.update);
  router.delete('/permisos/:id', permisoController.delete);

  // Rol-Permiso (Asignaciones)
  router.get('/roles-permisos', rolPermisoController.getAll);
  router.post('/roles-permisos', validateFields(rolPermisoSchema), rolPermisoController.create);
  router.delete('/roles-permisos/:idRol/:idPermiso', rolPermisoController.delete);

  // Sucursal
  router.get('/sucursales', sucursalController.getAll);
  router.get('/sucursales/:id', sucursalController.getById);
  router.post('/sucursales', validateFields(sucursalSchema), sucursalController.create);
  router.put('/sucursales/:id', validateFields(sucursalUpdateSchema), sucursalController.update);
  router.delete('/sucursales/:id', sucursalController.delete);

  // Usuario (rutas con :id, registradas al final para no capturar /roles, /permisos, etc.)
  router.get('/:id', usuarioController.getById);
  router.put('/:id', validateFields(usuarioUpdateSchema), usuarioController.update);
  router.delete('/:id',usuarioController.delete);

  return router;
};
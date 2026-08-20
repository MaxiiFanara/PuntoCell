export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let detalles = null;

  // Errores de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409; // Conflict: el recurso ya existe
    // Red de seguridad ante condición de carrera (dos altas simultáneas con el mismo IMEI)
    const original = (err.original && err.original.message) || '';
    message = /UQ_Inventario_IMEI/i.test(original)
      ? 'Ya existe un producto en inventario con ese IMEI.'
      : 'Error de validación en la base de datos.';
    detalles = err.errors.map(e => e.message);
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Error de validación en la base de datos.';
    detalles = err.errors.map(e => e.message);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso.';
  }

  // Solo se loguea si es un 500 no esperado, para no ensuciar la consola con 404/400
  if (statusCode === 500) {
    console.error('🔥 [ERROR CRÍTICO DEL SERVIDOR]:', err);
  }

  const errorResponse = {
    // 4xx = culpa del cliente ('fail'), 5xx = error nuestro ('error')
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message: message
  };

  if (detalles) {
    errorResponse.detalles = detalles;
  }

  // IMEI ya existente sin stock: el front puede ofrecer reingresarlo (garantía/reparación/recompra)
  if (err.reingreso !== undefined) {
    errorResponse.reingreso = err.reingreso;
    errorResponse.idInventarioExistente = err.idInventarioExistente;
  }

  return res.status(statusCode).json(errorResponse);
};
export default class UsuarioController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const data = await this.service.getAll(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      const data = await this.service.getById(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

 create = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      const data = await this.service.create(req.body, auditContext);
      return res.status(201).json({ status: 'success', data });
    } catch (error) {
      // Respetamos el statusCode que ya haya seteado el service (ej. 404 "no encontrado")
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      // Errores conocidos sin statusCode explícito (duplicados de negocio)
      if (error.message.includes('ya está registrado')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }

      // Si es un error de base de datos o algo grave, lo mandamos al global
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      const data = await this.service.update(id, req.body, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      // Respetamos el statusCode que ya haya seteado el service (ej. 404 "no encontrado")
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      // Errores conocidos sin statusCode explícito (duplicados de negocio)
      if (error.message.includes('ya está registrado')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      await this.service.delete(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data: { message: 'Usuario dado de baja exitosamente' } });
    } catch (err) {
      next(err);
    }
  };
}
export default class RolPermisoController {
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

  create = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      const data = await this.service.create(req.body, auditContext);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { idRol, idPermiso } = req.params;
      const auditContext = { IdEmpleado: req.user?.id || null, IdSucursal: req.user?.sucursal || null, IpAddress: req.ip };
      await this.service.delete(idRol, idPermiso, auditContext);
      return res.status(200).json({ status: 'success', data: { message: 'Permiso revocado del rol exitosamente' } });
    } catch (err) {
      next(err);
    }
  };
}
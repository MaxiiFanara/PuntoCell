export default class TransferenciaController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.getAll(req.query, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.getById(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.create(req.body, auditContext);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  ejecutarTraspaso = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      // Llamamos a la transacción que creamos en el Service
      const data = await this.service.ejecutarTraspaso(req.body, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.update(req.params.id, req.body, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      await this.service.remove(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data: { message: 'Transferencia eliminada correctamente' } });
    } catch (err) {
      next(err);
    }
  };
}

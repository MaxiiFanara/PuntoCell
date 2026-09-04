export default class RepuestoOrdenController {
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
      const data = await this.service.getById(req.params.id);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const ctx = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.create(req.body, ctx);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      const ctx = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      await this.service.delete(req.params.id, ctx);
      return res.status(200).json({ status: 'success', data: { message: 'Repuesto quitado de la orden exitosamente' } });
    } catch (err) {
      next(err);
    }
  };

  getRepuestosDisponibles = async (req, res, next) => {
    try {
      const data = await this.service.getRepuestosDisponibles(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}
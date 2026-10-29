const ctxDe = (req) => ({ IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip });

export default class DispositivoClienteController {
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
      const data = await this.service.create(req.body, ctxDe(req));
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const data = await this.service.update(req.params.id, req.body, ctxDe(req));
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.delete(req.params.id, ctxDe(req));
      return res.status(200).json({ status: 'success', data: { message: 'Dispositivo eliminado exitosamente' } });
    } catch (err) {
      next(err);
    }
  };
}
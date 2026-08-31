export default class PagoCompraController {
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

  // POST = registrar un pago posterior sobre una Compra existente. Un pago registrado
  // es inmutable: no hay update ni delete.
  create = async (req, res, next) => {
    try {
      const ctx = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.create(req.body, ctx);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}

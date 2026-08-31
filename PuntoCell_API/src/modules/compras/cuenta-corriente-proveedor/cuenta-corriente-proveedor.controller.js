export default class CuentaCorrienteProveedorController {
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

  getSaldoPorProveedor = async (req, res, next) => {
    try {
      const data = await this.service.getSaldoPorProveedor(req.params.id);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}

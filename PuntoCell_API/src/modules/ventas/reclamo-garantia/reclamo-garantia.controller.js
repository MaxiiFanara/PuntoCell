export default class ReclamoGarantiaController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const data = await this.service.getAll(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getById(req.params.id);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.create(req.body);
      return res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const data = await this.service.update(req.params.id, req.body);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.remove(req.params.id);
      return res.status(200).json({ status: 'success', data: { message: 'ReclamoGarantia eliminado' } });
    } catch (err) { next(err); }
  };
}

export default class InformeOperativoController {
  constructor(service) {
    this.service = service;
  }

  get = async (req, res, next) => {
    try {
      const data = await this.service.generar({ desde: req.query.desde, hasta: req.query.hasta });
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };
}

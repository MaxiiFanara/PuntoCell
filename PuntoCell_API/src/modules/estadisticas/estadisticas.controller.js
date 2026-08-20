export default class EstadisticasController {
  constructor(service) {
    this.service = service;
  }

  marcasReparadas = async (req, res, next) => {
    try {
      const data = await this.service.getMarcasReparadas(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  dispositivosReparados = async (req, res, next) => {
    try {
      const data = await this.service.getDispositivosReparados(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  repuestosUsados = async (req, res, next) => {
    try {
      const data = await this.service.getRepuestosUsados(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  fallasRepetidas = async (req, res, next) => {
    try {
      const data = await this.service.getFallasRepetidas(req.query);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  finanzas = async (req, res, next) => {
    try {
      const data = await this.service.getFinanzas();
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  dashboard = async (req, res, next) => {
    try {
      const data = await this.service.getDashboard();
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}

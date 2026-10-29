export default class AsistenteCatalogoController {
  constructor(service) {
    this.service = service;
  }

  consultar = async (req, res, next) => {
    try {
      const mensaje = req.body?.mensaje ?? req.query?.mensaje;
      const contexto = req.body?.contexto ?? req.query?.contexto ?? null;
      const historial = req.body?.historial ?? [];
      const modelo = req.body?.modelo ?? req.query?.modelo ?? null;

      const data = await this.service.consultar({ mensaje, contexto, historial, modelo });

      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
      }
      next(err);
    }
  };
}
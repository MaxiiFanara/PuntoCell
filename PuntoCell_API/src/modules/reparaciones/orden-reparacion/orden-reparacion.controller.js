export default class OrdenReparacionController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const result = await this.service.getAll(req.query);
      // Con "page" el service devuelve { rows, total, page, limit }; sin ella, un array plano.
      if (result && Array.isArray(result.rows)) {
        return res.status(200).json({
          status: 'success',
          results: result.rows.length,
          total: result.total,
          page: result.page,
          limit: result.limit,
          data: result.rows
        });
      }
      return res.status(200).json({ status: 'success', results: result.length, data: result });
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
      const data = await this.service.create(req.body, req.user.id, ctx);
      return res.status(201).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const data = await this.service.updateStatus(req.params.id, {
        ...req.body,
        idEmpleadoSesion: req.user.id,
        ctx: { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip }
      });
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  enviarComprobante = async (req, res, next) => {
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) return res.status(400).json({ status: 'error', message: 'pdfBase64 es requerido.' });
      const data = await this.service.enviarComprobante(req.params.id, pdfBase64);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.delete(req.params.id);
      return res.status(200).json({ status: 'success', data: { message: 'Orden eliminada exitosamente' } });
    } catch (err) {
      next(err);
    }
  };
}
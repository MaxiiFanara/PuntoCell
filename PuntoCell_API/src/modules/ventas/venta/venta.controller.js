export default class VentaController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.getAll(req.query, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  getById = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.getById(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.create(req.body, auditContext);
      return res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.update(req.params.id, req.body, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      await this.service.remove(req.params.id, auditContext);
      return res.status(200).json({ status: 'success', data: { message: 'Venta eliminada' } });
    } catch (err) { next(err); }
  };

  historico = async (req, res, next) => {
    try {
      const filters = {
        cliente: req.query.cliente,
        producto: req.query.producto,
        vendedor: req.query.vendedor,
        idEmpleado: req.query.idEmpleado,
        desde: req.query.desde,
        hasta: req.query.hasta,
        montoMin: req.query.montoMin
      };
      const auditContext = { IdEmpleado: req.user?.id, IdSucursal: req.user?.sucursal, Ip: req.ip };
      const data = await this.service.historico(filters, auditContext);
      return res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  };
}

export default class CatalogoController {
  constructor(service) {
    this.service = service;
  }

  getProductos = async (req, res, next) => {
    try {
      const data = await this.service.getProductosVendibles({ IdSucursal: req.query.IdSucursal, IdListaPrecio: req.query.IdListaPrecio });
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}

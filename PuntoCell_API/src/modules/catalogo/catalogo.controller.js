export default class CatalogoController {
  constructor(service, especificacionesService) {
    this.service = service;
    this.especificacionesService = especificacionesService;
  }

  getProductos = async (req, res, next) => {
    try {
      const data = await this.service.getProductosVendibles({ IdSucursal: req.query.IdSucursal, IdListaPrecio: req.query.IdListaPrecio });
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  getCotizaciones = async (req, res, next) => {
    try {
      const data = await this.service.getCotizaciones();
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  // GET /catalogo/comparar?ids=12,45,78 — datos propios de cada producto (los
  // mismos de la vitrina) más la ficha técnica del modelo cuando existe.
  comparar = async (req, res, next) => {
    try {
      const ids = [...new Set(String(req.query.ids || '').split(',').map((id) => id.trim()).filter(Boolean))];
      if (ids.length < 2 || ids.length > 3) {
        return res.status(400).json({ status: 'error', message: 'Elegí entre 2 y 3 productos para comparar' });
      }

      const { productos, cotizacionDolar } = await this.service.getProductosVendibles();
      const elegidos = ids.map((id) => productos.find((p) => p.id === id));
      if (elegidos.some((p) => !p)) {
        return res.status(404).json({ status: 'error', message: 'Alguno de los productos ya no está disponible' });
      }
      if (elegidos.some((p) => !this.especificacionesService.esComparable(p.categoria))) {
        return res.status(400).json({ status: 'error', message: 'Solo se pueden comparar celulares y tablets' });
      }

      // Una ficha por modelo (dos unidades del mismo modelo comparten ficha). En
      // serie y no en paralelo: respeta el límite de pedidos por minuto de la API.
      const fichas = new Map();
      for (const p of elegidos) {
        const clave = `${p.marca}|${p.modelo}`;
        if (!fichas.has(clave)) fichas.set(clave, await this.especificacionesService.getFicha({ marca: p.marca, modelo: p.modelo }));
      }

      const data = {
        cotizacionDolar,
        productos: elegidos.map((p) => ({ ...p, ficha: fichas.get(`${p.marca}|${p.modelo}`) })),
      };
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };
}

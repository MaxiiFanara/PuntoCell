export default class PagosController {
  constructor(service) {
    this.service = service;
  }

  postCheckout = async (req, res, next) => {
    try {
      const data = await this.service.crearCheckout({
        items: req.body?.items,
        comprador: req.body?.comprador || {},
      });
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ status: 'error', message: err.message, detalle: err.detalle });
      }
      if (err.status === 400) {
        return res.status(400).json({ status: 'error', message: err.message });
      }
      next(err);
    }
  };

  getPago = async (req, res, next) => {
    try {
      const data = await this.service.consultarPago(req.params.paymentId);
      if (!data) return res.status(404).json({ status: 'error', message: 'Pago no encontrado' });
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  // El body del webhook no se usa como dato: solo se saca el id y se le pregunta
  // el estado a MP. Por eso no hace falta validar la firma x-signature.
  // Siempre responde 200: cualquier otra cosa hace que MP reintente en bucle.
  postWebhook = async (req, res) => {
    const paymentId = req.body?.data?.id;
    try {
      if (paymentId) await this.service.consultarPago(String(paymentId));
    } catch (err) {
      console.error('Webhook de Mercado Pago falló:', err.message);
    }
    return res.status(200).send('ok');
  };
}

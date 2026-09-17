import { randomUUID } from 'node:crypto';

const SUCURSAL_CATALOGO = 1;

const error409 = (detalle) => {
  const err = new Error('Hay productos que ya no se pueden comprar');
  err.status = 409;
  err.detalle = detalle;
  return err;
};

// MP tiene más estados de los que le importan a la vitrina. Se colapsan a tres,
// y lo que no está en el mapa cae en 'desconocido' para que agregar un estado
// nuevo del lado de MP no rompa la pantalla de resultado.
const ESTADOS = {
  approved: 'approved',
  authorized: 'approved',
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
  refunded: 'rejected',
};

// catalogoService y mpClient se inyectan para poder chequear el módulo sin base
// ni red (scripts/check-pagos.mjs).
export const crearPagosService = ({ catalogoService, mpClient, backUrlBase, webhookUrl }) => {

  const crearCheckout = async ({ items = [], comprador = {} }) => {
    if (!items.length) {
      const err = new Error('El carrito está vacío');
      err.status = 400;
      throw err;
    }

    // Se revalida contra el catálogo real en vez de confiar en el carrito: el
    // localStorage del comprador es editable y mandaría el precio que quiera.
    // Se reusa CatalogoService para que el precio cobrado sea exactamente el
    // mismo que muestra la vitrina (misma resolución de lista minorista vigente).
    // ponytail: trae el catálogo entero para validar N ítems. Si el catálogo
    // crece, filtrar por ids en el propio service del catálogo.
    const { productos } = await catalogoService.getProductosVendibles({ IdSucursal: SUCURSAL_CATALOGO });
    const porId = new Map(productos.map((p) => [String(p.id), p]));

    const rechazados = [];
    const itemsPreferencia = [];

    for (const item of items) {
      const id = String(item.id);
      const cantidad = Math.max(1, Number(item.cantidad) || 0);
      const producto = porId.get(id);

      if (!producto) {
        rechazados.push({ id, motivo: 'inexistente', disponible: 0 });
        continue;
      }
      if (Number(producto.stock) < cantidad) {
        rechazados.push({ id, motivo: 'sin_stock', disponible: Number(producto.stock) });
        continue;
      }

      itemsPreferencia.push({
        id,
        title: producto.name,
        quantity: cantidad,
        // Precio de la base, en pesos y sin convertir: es lo que muestra el catálogo.
        unit_price: Number(producto.priceUsd),
        currency_id: 'ARS',
      });
    }

    if (rechazados.length) throw error409(rechazados);

    const externalReference = randomUUID();
    const resultado = `${backUrlBase}/catalogo/pago/resultado`;

    const preferencia = {
      items: itemsPreferencia,
      external_reference: externalReference,
      payer: {
        email: comprador.email,
        name: comprador.nombre,
        phone: comprador.telefono ? { number: String(comprador.telefono) } : undefined,
      },
      back_urls: { success: resultado, pending: resultado, failure: resultado },
    };

    // auto_return exige back_urls https; con localhost, MP rechaza la preferencia
    // entera. En desarrollo el comprador vuelve con el botón de MP.
    if (backUrlBase.startsWith('https://')) preferencia.auto_return = 'approved';

    // MP no puede alcanzar localhost: sin URL pública no se manda notification_url.
    if (webhookUrl) preferencia.notification_url = webhookUrl;

    const pref = await mpClient.crearPreferencia(preferencia);

    return { initPoint: pref.init_point, externalReference };
  };

  const consultarPago = async (paymentId) => {
    // Ante un id inválido como "0", MP responde 400 y no 404, así que el endpoint
    // devolvía 500 por una URL que cualquiera puede escribir. Se descarta acá y no
    // en el controller para cubrir también al webhook, que llama por este mismo camino.
    if (!/^[1-9]\d*$/.test(String(paymentId ?? ''))) return null;

    const pago = await mpClient.obtenerPago(paymentId);
    if (!pago) return null;

    // El comprobante se arma con lo que devuelve MP, no con el carrito del
    // navegador: así sigue siendo reproducible si el comprador pagó desde otro
    // dispositivo o vuelve al link más tarde.
    const items = (pago.additional_info?.items || []).map((i) => ({
      title: i.title,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unit_price) || 0,
    }));

    return {
      estado: ESTADOS[pago.status] || 'desconocido',
      paymentId: String(pago.id),
      externalReference: pago.external_reference || null,
      total: Number(pago.transaction_amount) || 0,
      items,
      fecha: pago.date_approved || pago.date_created || null,
      medio: pago.payment_method_id || null,
    };
  };

  return { crearCheckout, consultarPago };
};

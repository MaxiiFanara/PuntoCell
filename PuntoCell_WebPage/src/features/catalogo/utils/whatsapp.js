import { STORE_CONFIG } from '../config/store';

/**
 * Formatea números
 */
export const formatCurrency = (amount) =>
  new Intl.NumberFormat(
    STORE_CONFIG.locale,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(amount);

/**
 * Link WhatsApp
 */
// paymentId es opcional: cuando viene, el mensaje deja de ser una consulta y
// pasa a ser la coordinación de entrega de una compra ya pagada.
export const buildWhatsAppLink = (
  cartItems,
  paymentId = null
) => {
  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cartItems.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const lines = cartItems.map((item) => {
    const subtotal =
      item.price * item.quantity;

    return [
      `🪑 *${item.name}*`,
      `Cantidad: ${item.quantity}`,
      `Subtotal: $${formatCurrency(
        subtotal
      )}`,
    ].join('\n');
  });

  const message = [
    paymentId
      ? `✅ *Compra pagada en ${STORE_CONFIG.business.name}*`
      : `✨ *Nuevo pedido desde ${STORE_CONFIG.business.name}*`,
    '',
    ...lines.flatMap((line) => [line, '']),
    '──────────────────',
    `🛒 Productos: ${totalItems}`,
    `💰 *Total: $${formatCurrency(total)}*`,
    ...(paymentId ? ['', `🧾 Pago Mercado Pago: *${paymentId}*`] : []),
    '',
    paymentId
      ? '¡Hola! Ya pagué este pedido, quería coordinar la entrega 😊'
      : '¡Hola! Me gustaría realizar este pedido 😊',
  ].join('\n');

  return `https://wa.me/${
    STORE_CONFIG.business.whatsapp
  }?text=${encodeURIComponent(message)}`;
};
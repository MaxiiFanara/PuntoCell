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
export const buildWhatsAppLink = (
  cartItems
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
    `✨ *Nuevo pedido desde ${STORE_CONFIG.business.name}*`,
    '',
    ...lines.flatMap((line) => [line, '']),
    '──────────────────',
    `🛒 Productos: ${totalItems}`,
    `💰 *Total: $${formatCurrency(total)}*`,
    '',
    '¡Hola! Me gustaría realizar este pedido 😊',
  ].join('\n');

  return `https://wa.me/${
    STORE_CONFIG.business.whatsapp
  }?text=${encodeURIComponent(message)}`;
};
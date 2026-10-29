// Quita de un texto los identificadores internos (Id=123, "(Id=123)", etc.) para que solo el
// rol analista los vea. Los números de comprobante (Compra #15) se conservan: "Compra Id=15"
// pasa a "Compra #15", pero "Inventario no encontrado (Id=7)" queda "Inventario no encontrado".
export const sanitizarIds = (texto) => {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/\s*\([^()]*\bId\w*\s*=\s*\d+[^()]*\)/gi, '')
    .replace(/\b(Compra|Venta|Orden|Pedido)\s+Id\s*=\s*(\d+)/gi, '$1 #$2')
    .replace(/\s*\bId\w*\s*=\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
};

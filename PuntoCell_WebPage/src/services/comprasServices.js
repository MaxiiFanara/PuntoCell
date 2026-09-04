// ============================================================
//  CAPA DE SERVICIOS – COMPRAS / ABASTECIMIENTO
// ============================================================
//  POST /compras/compras es un endpoint orquestado y transaccional: crea la
//  cabecera + resuelve/crea Inventario + MovimientoStock + DetalleCompra +
//  PrecioArticulo + deuda en CuentaCorrienteProveedor + Pagos[] iniciales.
//  El backend es la única fuente de verdad de los totales — no confía en el body.
// ============================================================

import { fetchApi } from './api';

const soloArray = (res) => {
  const data = res?.data ?? res ?? [];
  return Array.isArray(data) ? data : (data?.rows ?? []);
};

// Map EstadoPago (1/2/3) → etiqueta legible
export const ESTADO_PAGO = { 1: 'Pendiente', 2: 'Parcial', 3: 'Pagada' };

export const comprasService = {
  // --- Compras ---
  getCompras: async () => soloArray(await fetchApi('/compras/compras')),

  getCompra: async (id) => {
    const res = await fetchApi(`/compras/compras/${id}`);
    return res?.data ?? res;
  },

  // payload: { Fecha?, IdProveedor, IdSucursalDestino, IdEmpleado, IdTurnoCaja?, Detalles[], Pagos[] }
  //   Detalles[]: { IdInventario? | IdArticulo?, Cantidad, PrecioCostoUnitario,
  //                 IdColor?, IdMemoria?, IdBateria?, MesesGarantiaLocal?, IMEIs?[], Observaciones? }
  //   Pagos[]:    { IdMetodoPago, Monto, FechaPago? }
  crearCompra: async (payload) => {
    const res = await fetchApi('/compras/compras', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res; // { compra, totalPagado, advertencias }
  },

  // --- Proveedores ---
  getProveedores: async () => soloArray(await fetchApi('/compras/proveedores')),

  crearProveedor: async (data) => {
    const res = await fetchApi('/compras/proveedores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  // --- Cuenta corriente del proveedor ---
  getResumenProveedor: async (idProveedor) => {
    const res = await fetchApi(`/compras/proveedores/${idProveedor}/cuenta-corriente`);
    return res?.data ?? res;
  },

  getSaldoProveedor: async (idProveedor) => {
    const res = await fetchApi(`/compras/proveedores/${idProveedor}/saldo`);
    return res?.data ?? res;
  },

  // --- Pago posterior sobre una compra existente ---
  // { IdCompra, IdMetodoPago, Monto, IdTurnoCaja, FechaPago? }
  crearPago: async (payload) => {
    const res = await fetchApi('/compras/pagos-compra', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  getPagosCompra: async () => soloArray(await fetchApi('/compras/pagos-compra')),

  // --- Artículos (para elegir/crear el producto que se compra) ---
  getArticulos: async () => {
    const res = await fetchApi('/inventario/articulos');
    return soloArray(res);
  },

  crearArticulo: async (data) => {
    const res = await fetchApi('/inventario/articulos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },
};

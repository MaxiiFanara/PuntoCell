// ============================================================
//  CAPA DE SERVICIOS – BITÁCORA / AUDITORÍA
// ============================================================
//  GET /api/auditoria/bitacoras — solo lectura. Los registros los crea el backend
//  internamente (registerAudit); nunca se escriben por API.
//  Forma: { Id, Detalle, IpAddress, Fecha, IdEmpleado, IdSucursal, Accion }
//  Accion es texto libre que arma el backend (ej. "Crear Venta", "Login fallido: …").
// ============================================================

import { fetchApi } from './api';

const soloArray = (res) => {
  const data = res?.data ?? res ?? [];
  return Array.isArray(data) ? data : (data?.rows ?? []);
};

export const bitacoraService = {
  getAll: async () => soloArray(await fetchApi('/auditoria/bitacoras')),
};

export async function registerAudit(bitacoraService, { detalle, Accion = null, IdEmpleado = null, IdSucursal = null, IpAddress = null, Fecha = new Date() } = {}) {
  if (!bitacoraService || typeof bitacoraService.create !== 'function') return null;

  // Accion es obligatoria (NOT NULL en la tabla): sin un texto que describa qué pasó
  // el registro no aporta nada, así que lo salteamos en vez de reventar el INSERT.
  if (!Accion) {
    console.warn('registerAudit: llamada sin "Accion", se omite el registro de bitácora.');
    return null;
  }

  const bitacora = {
    Detalle: detalle ?? null,
    IpAddress: IpAddress || null,
    Fecha,
    IdEmpleado: IdEmpleado ?? null,
    IdSucursal: IdSucursal ?? null,
    Accion
  };

  try {
    return await bitacoraService.create(bitacora);
  } catch (err) {
    console.error('registerAudit error:', err);
    return null;
  }
}

// Atajo para auditar desde un service: toma un auditContext { IdEmpleado, IdSucursal, Ip }
// (el que arman los controllers) + el texto de la acción y un detalle opcional.
export async function auditar(bitacoraService, ctx, Accion, detalle = null) {
  return registerAudit(bitacoraService, {
    Accion,
    detalle,
    IdEmpleado: ctx?.IdEmpleado ?? null,
    IdSucursal: ctx?.IdSucursal ?? null,
    IpAddress: ctx?.Ip ?? ctx?.IpAddress ?? null
  });
}

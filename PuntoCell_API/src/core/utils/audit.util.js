export async function registerAudit(bitacoraService, { detalle, Accion = null, IdEmpleado = null, IdSucursal = null, IpAddress = null, Fecha = new Date() } = {}) {
  if (!bitacoraService || typeof bitacoraService.create !== 'function') return null;

  const bitacora = {
    Detalle: detalle,
    IpAddress: IpAddress || null,
    Fecha,
    IdEmpleado: IdEmpleado || null,
    IdSucursal: IdSucursal || null,
    Accion: Accion || null
  };

  try {
    return await bitacoraService.create(bitacora);
  } catch (err) {
    console.error('registerAudit error:', err);
    return null;
  }
}

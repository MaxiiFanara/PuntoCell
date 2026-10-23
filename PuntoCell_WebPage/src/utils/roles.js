// Rol técnico y único "analista" (tabla Rol, Id 5): solo accede al informe operativo.
export const ROL_ANALISTA = 5
export const RUTA_INFORME_ANALISTA = '/analista/informe'
export const destinoPorRol = (rol) => (rol === ROL_ANALISTA ? RUTA_INFORME_ANALISTA : '/app/punto-venta')

import { useAuth } from '../context/AuthContext'

// Roles: 1=Admin, 2=Encargado, 3=Atención, 4=Técnico
const PERMISOS_POR_ROL = {
  1: { puedeRegistrar: true,  puedeModificar: true,  puedeAnular: true,  puedeVerTodos: true,  puedeVerDetalle: false, puedeEntregarOrden: true,  estadoMaxEdicion: null }, // Admin
  2: { puedeRegistrar: true,  puedeModificar: true,  puedeAnular: true,  puedeVerTodos: true,  puedeVerDetalle: false, puedeEntregarOrden: true,  estadoMaxEdicion: null }, // Encargado
  3: { puedeRegistrar: true,  puedeModificar: false, puedeAnular: false, puedeVerTodos: false, puedeVerDetalle: true,  puedeEntregarOrden: true,  estadoMaxEdicion: null }, // Atención: solo entrega desde estado 3
  4: { puedeRegistrar: false, puedeModificar: true,  puedeAnular: false, puedeVerTodos: false, puedeVerDetalle: false, puedeEntregarOrden: false, estadoMaxEdicion: 2    }, // Técnico: solo edita hasta En Reparación
}

export const usePermisos = () => {
  const { usuario } = useAuth()
  const rol = usuario?.rol
  return PERMISOS_POR_ROL[rol] ?? PERMISOS_POR_ROL[3]
}

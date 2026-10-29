import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUsuario, getSesionActual, mapUsuario } from '../services/api'

const STORAGE_KEY = 'pc_usuario'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Restaura el perfil desde localStorage; si no está pero la cookie httpOnly sigue
  // viva (GET /auth/me), recupera la sesión igual. Evita el "Ya tienes una sesión
  // activa" del login cuando el localStorage se limpió pero la cookie no.
  useEffect(() => {
    let cancelado = false
    const restaurar = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          if (!cancelado) setUsuario(JSON.parse(stored))
          if (!cancelado) setLoading(false)
          return
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
      const u = await getSesionActual()
      if (cancelado) return
      if (u) {
        const perfil = mapUsuario(u)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil))
        setUsuario(perfil)
      }
      setLoading(false)
    }
    restaurar()
    return () => { cancelado = true }
  }, [])

  const login = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUsuario(userData)
  }

  const cerrarSesion = async () => {
    try {
      await logoutUsuario()
    } catch {
      // Si falla la llamada, igual limpiamos la sesión local
    } finally {
      localStorage.removeItem(STORAGE_KEY)
      setUsuario(null)
      navigate('/login')
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
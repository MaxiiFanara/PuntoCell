import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUsuario } from '../services/api'

const STORAGE_KEY = 'pc_usuario'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Restaura el perfil desde localStorage (la cookie httpOnly se maneja sola)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUsuario(JSON.parse(stored))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setLoading(false)
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
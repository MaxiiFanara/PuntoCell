import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Divider, Alert, CircularProgress,
  Tooltip, createTheme, ThemeProvider, CssBaseline,
} from '@mui/material'
import {
  Visibility, VisibilityOff, PhoneAndroid, LockOutlined,
  PersonOutline, LightMode, DarkMode, CheckCircleOutline,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { loginUsuario } from '../services/api'

// ─── Temas del login ──────────────────────────────────────────────────────────
const lightTheme = createTheme({
  palette: { mode: 'light' },
  typography: { fontFamily: "'Inter', sans-serif" },
})
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0f172a', paper: '#1e293b' },
    primary: { main: '#3b82f6' },
  },
  typography: { fontFamily: "'Inter', sans-serif" },
})

// ─── Animaciones CSS + View Transition ────────────────────────────────────────
const STYLES = `
  ::view-transition-old(root) {
    animation: none;
    mix-blend-mode: normal;
  }
  ::view-transition-new(root) {
    animation: vt-reveal 620ms cubic-bezier(0.4, 0, 0.2, 1) both;
    mix-blend-mode: normal;
  }
  @keyframes vt-reveal {
    from { clip-path: circle(0px at var(--vt-x, 50%) var(--vt-y, 50%)); }
    to   { clip-path: circle(200vmax at var(--vt-x, 50%) var(--vt-y, 50%)); }
  }
  @keyframes fadeSlideDown {
    from { opacity: 0; transform: translateY(-24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes blobFloat {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-20px) scale(1.04); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.5); }
    70%  { box-shadow: 0 0 0 12px rgba(37,99,235,0); }
    100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
  }
  @keyframes successBounce {
    0%   { transform: scale(0.4); opacity: 0; }
    60%  { transform: scale(1.18); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes cardEntrance {
    from { opacity: 0; transform: translateY(40px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes iconPop {
    from { opacity: 0; transform: rotate(-35deg) scale(0.55); }
    to   { opacity: 1; transform: rotate(0deg) scale(1); }
  }
  .logo-pulse   { animation: pulse-ring 2.6s ease-in-out infinite; }
  .anim-logo    { animation: fadeSlideDown 0.6s cubic-bezier(.22,1,.36,1) both; }
  .anim-card    { animation: cardEntrance  0.7s cubic-bezier(.22,1,.36,1) 0.15s both; }
  .anim-footer  { animation: fadeIn        0.8s ease 0.55s both; }
  .anim-success { animation: successBounce 0.55s cubic-bezier(.22,1,.36,1) both; }
  .icon-pop     { animation: iconPop       0.38s cubic-bezier(.22,1,.36,1) both; }
  .f0 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.28s both; }
  .f1 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.38s both; }
  .f2 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.46s both; }
  .f3 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.54s both; }
  .f4 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.62s both; }
  .f5 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.70s both; }
  .f6 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.78s both; }
`

const TEST_USER = { usuario: 'jgonzales', password: 'admin123' }

export default function LoginPage() {
  const { usuario, login } = useAuth()
  const navigate   = useNavigate()

  // Si ya hay una sesión activa (cookie + estado local vigentes), no tiene sentido
  // mostrar el form de nuevo — evita el 400 "Ya tienes una sesión activa" del backend.
  useEffect(() => {
    if (usuario) navigate('/app', { replace: true })
  }, [usuario, navigate])

  const [darkMode,      setDarkMode]      = useState(false)
  const [iconKey,       setIconKey]       = useState(0)
  const [showPassword,  setShowPassword]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)
  const [form,          setForm]          = useState({ usuario: '', password: '' })
  const fabRef = useRef(null)

  useEffect(() => {
    if (document.getElementById('pc-login-styles')) return
    const tag = document.createElement('style')
    tag.id = 'pc-login-styles'
    tag.textContent = STYLES
    document.head.appendChild(tag)
    return () => document.getElementById('pc-login-styles')?.remove()
  }, [])

  // Navega al sistema tras la animación de éxito
  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => navigate('/app'), 1500)
    return () => clearTimeout(id)
  }, [success, navigate])

  const handleThemeToggle = useCallback(() => {
    const fab = fabRef.current
    if (fab) {
      const rect = fab.getBoundingClientRect()
      document.documentElement.style.setProperty('--vt-x', `${Math.round(rect.left + rect.width  / 2)}px`)
      document.documentElement.style.setProperty('--vt-y', `${Math.round(rect.top  + rect.height / 2)}px`)
    }
    const next = !darkMode
    if (document.startViewTransition) {
      document.startViewTransition(() => { setDarkMode(next); setIconKey((k) => k + 1) })
    } else {
      setDarkMode(next); setIconKey((k) => k + 1)
    }
  }, [darkMode])

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); if (error) setError('') }
  const fillTestUser = () => { setForm(TEST_USER); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario || !form.password) { setError('Por favor completá todos los campos.'); return }
    setLoading(true); setError('')
    try {
      const res = await loginUsuario(form.usuario, form.password)
      const u = res.data.user
      login({
        userID:   u.Id,
        user:     `${u.Nombre ?? ''} ${u.Apellido ?? ''}`.trim() || u.UsuarioEmpleado,
        rol:      u.IdRol,
        sucursal: u.IdSucursal,
      })
      setSuccess(true)
    } catch (err) {
      // err.status presente = el backend respondió (credenciales, validación, sesión activa, etc.)
      // sin err.status = falló el fetch en sí (servidor caído / sin red)
      if (err.status) {
        setError(err.message === 'Credenciales inválidas' ? 'Usuario o contraseña incorrectos.' : err.message)
      } else {
        setError('No se pudo conectar con el servidor. Verificá tu conexión.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Tokens de color según el modo ───────────────────────────────────────────
  const isDark      = darkMode
  const bgGradient  = isDark ? 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)' : 'linear-gradient(160deg,#ffffff 0%,#f1f5f9 100%)'
  const blob1       = isDark ? 'rgba(59,130,246,0.13)' : 'rgba(37,99,235,0.10)'
  const blob2       = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.07)'
  const cardBg      = isDark ? '#1e293b' : '#ffffff'
  const cardBorder  = isDark ? '#334155' : '#e5e7eb'
  const titleColor  = isDark ? '#f1f5f9' : '#111827'
  const subColor    = isDark ? '#94a3b8' : '#6b7280'
  const fieldBg     = isDark ? '#0f172a' : '#f9fafb'
  const iconColor   = isDark ? '#64748b' : '#9ca3af'
  const divColor    = isDark ? '#334155' : '#f3f4f6'
  const footerColor = isDark ? '#475569' : '#9ca3af'
  const blue        = '#2563eb'

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px', background: fieldBg,
      '& input': { color: titleColor },
      '&:hover .MuiOutlinedInput-notchedOutline':      { borderColor: blue },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: blue, borderWidth: '2px' },
    },
    '& .MuiInputLabel-root':            { color: subColor },
    '& .MuiInputLabel-root.Mui-focused':{ color: blue },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#334155' : '#e5e7eb' },
  }

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bgGradient, px: 2, position: 'relative', overflow: 'hidden',
      }}>

        {/* Blobs de fondo */}
        <Box sx={{ position: 'fixed', top: -120, right: -120, width: 430, height: 430, borderRadius: '50%',
          background: `radial-gradient(circle,${blob1} 0%,transparent 70%)`,
          animation: 'blobFloat 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <Box sx={{ position: 'fixed', bottom: -100, left: -100, width: 370, height: 370, borderRadius: '50%',
          background: `radial-gradient(circle,${blob2} 0%,transparent 70%)`,
          animation: 'blobFloat 9s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        <Box sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <Box className="anim-logo" sx={{ textAlign: 'center', mb: 4 }}>
            <Box className="logo-pulse" sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 60, height: 60, borderRadius: '18px',
              background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)',
              mb: 2, boxShadow: '0 8px 28px rgba(37,99,235,0.35)',
            }}>
              <PhoneAndroid sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: titleColor, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              Punto <Box component="span" sx={{ color: blue }}>Cell</Box>
            </Typography>
            <Typography variant="body2" sx={{ color: subColor, mt: 0.5, fontWeight: 500 }}>
              Sistema de Gestión Integral
            </Typography>
          </Box>

          {/* Card */}
          <Card className="anim-card" elevation={0} sx={{
            borderRadius: '20px', border: `1px solid ${cardBorder}`, background: cardBg,
            boxShadow: isDark
              ? '0 4px 6px rgba(0,0,0,0.4),0 20px 40px rgba(0,0,0,0.3)'
              : '0 4px 6px rgba(0,0,0,0.07),0 20px 40px rgba(0,0,0,0.10)',
          }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              {success ? (
                <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CheckCircleOutline className="anim-success" sx={{ fontSize: 72, color: '#22c55e' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor }}>¡Bienvenido de vuelta!</Typography>
                  <Typography variant="body2" sx={{ color: subColor }}>Redirigiendo al sistema...</Typography>
                  <CircularProgress size={20} sx={{ color: blue, mt: 1 }} />
                </Box>
              ) : (
                <>
                  <Box className="f0">
                    <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor, mb: 0.5, letterSpacing: '-0.2px' }}>
                      Iniciar sesión
                    </Typography>
                    <Typography variant="body2" sx={{ color: subColor, mb: 2.5 }}>
                      Ingresá tus credenciales para continuar
                    </Typography>
                  </Box>

                  <Box className="f1">
                    <Box onClick={fillTestUser} sx={{
                      display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 2.5, borderRadius: '10px',
                      border: `1px dashed ${isDark ? '#3b82f6' : '#93c5fd'}`,
                      background: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
                      cursor: 'pointer', transition: 'all 0.2s',
                      '&:hover': { background: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', transform: 'translateY(-1px)' },
                    }}>
                      <Typography variant="caption" sx={{ color: blue, fontWeight: 600, fontSize: '0.78rem' }}>
                        Usuario de prueba:
                      </Typography>
                      <Typography variant="caption" sx={{ color: subColor, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        jgonzales / admin123
                      </Typography>
                      <Typography variant="caption" sx={{ color: blue, fontWeight: 600, fontSize: '0.72rem', ml: 'auto' }}>
                        Completar →
                      </Typography>
                    </Box>
                  </Box>

                  {error && (
                    <Box className="f2">
                      <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', fontSize: '0.85rem', '& .MuiAlert-icon': { fontSize: 18 } }}>
                        {error}
                      </Alert>
                    </Box>
                  )}

                  <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Box className="f3">
                      <TextField fullWidth label="Usuario" name="usuario" value={form.usuario} onChange={handleChange}
                        variant="outlined" size="medium" autoComplete="username"
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutline sx={{ color: iconColor, fontSize: 20 }} /></InputAdornment> } }}
                        sx={{ mb: 2.5, ...inputSx }} />
                    </Box>

                    <Box className="f4">
                      <TextField fullWidth label="Contraseña" name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password} onChange={handleChange}
                        variant="outlined" size="medium" autoComplete="current-password"
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: iconColor, fontSize: 20 }} /></InputAdornment>,
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: iconColor }}>
                                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ mb: 1, ...inputSx }} />
                    </Box>

                    <Box className="f5" sx={{ textAlign: 'right', mb: 3 }}>
                      <Typography
                        component="span"
                        variant="body2"
                        onClick={() => navigate('/forgot-password')}
                        sx={{
                          color: blue, fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Typography>
                    </Box>

                    <Box className="f6">
                      <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                        sx={{
                          borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '1rem', py: 1.5,
                          background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)',
                          boxShadow: '0 4px 14px rgba(37,99,235,0.40)', transition: 'all 0.25s',
                          '&:hover': { background: 'linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%)', boxShadow: '0 6px 22px rgba(37,99,235,0.55)', transform: 'translateY(-1px)' },
                          '&:active': { transform: 'translateY(0px)' },
                          '&.Mui-disabled': { background: isDark ? '#1e293b' : '#e5e7eb', boxShadow: 'none' },
                        }}>
                        {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Ingresar al sistema'}
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: divColor }}>
                    <Typography variant="caption" sx={{ color: footerColor, px: 1 }}>Punto Cell © 2026</Typography>
                  </Divider>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: footerColor, lineHeight: 1.6 }}>
                    Acceso restringido al personal autorizado.<br />
                    Ante problemas de acceso, contactá al administrador.
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          <Typography className="anim-footer" variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: footerColor }}>
            Proyecto final de carrera · Institución Cervantes
          </Typography>
        </Box>

        {/* FAB toggle dark/light */}
        <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'} placement="left">
          <Box
            ref={fabRef}
            onClick={handleThemeToggle}
            sx={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
              width: 52, height: 52, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              background: isDark
                ? 'linear-gradient(135deg,#1e293b,#334155)'
                : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              boxShadow: isDark
                ? '0 4px 20px rgba(0,0,0,0.55),0 0 0 1.5px #475569'
                : '0 4px 20px rgba(37,99,235,0.50),0 0 0 1.5px #3b82f6',
              transition: 'transform 0.15s',
              '&:hover':  { transform: 'scale(1.10)' },
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <Box key={iconKey} className="icon-pop" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDark
                ? <LightMode sx={{ color: '#fbbf24', fontSize: 24 }} />
                : <DarkMode  sx={{ color: '#fff',    fontSize: 22 }} />}
            </Box>
          </Box>
        </Tooltip>
      </Box>
    </ThemeProvider>
  )
}

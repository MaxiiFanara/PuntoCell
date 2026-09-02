import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Divider, Alert, CircularProgress,
} from '@mui/material'
import {
  Visibility, VisibilityOff, PhoneAndroid, LockOutlined,
  PersonOutline, CheckCircleOutline,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { loginUsuario, getSesionActual, mapUsuario } from '../services/api'

// ─── Animaciones CSS + View Transition ────────────────────────────────────────
const STYLES = `
  ::view-transition-old(root) { animation: none; mix-blend-mode: normal; }
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
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(var(--pc-palette-primary-mainChannel) / 0.5); }
    70%  { box-shadow: 0 0 0 12px rgba(var(--pc-palette-primary-mainChannel) / 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--pc-palette-primary-mainChannel) / 0); }
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
  .logo-pulse   { animation: pulse-ring 2.6s ease-in-out infinite; }
  .anim-logo    { animation: fadeSlideDown 0.6s cubic-bezier(.22,1,.36,1) both; }
  .anim-card    { animation: cardEntrance  0.7s cubic-bezier(.22,1,.36,1) 0.15s both; }
  .anim-footer  { animation: fadeIn        0.8s ease 0.55s both; }
  .anim-success { animation: successBounce 0.55s cubic-bezier(.22,1,.36,1) both; }
  .f0 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.28s both; }
  .f1 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.38s both; }
  .f2 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.46s both; }
  .f3 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.54s both; }
  .f4 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.62s both; }
  .f5 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.70s both; }
  .f6 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.78s both; }
  @media (prefers-reduced-motion: reduce) {
    .logo-pulse, .anim-logo, .anim-card, .anim-footer, .anim-success,
    .f0, .f1, .f2, .f3, .f4, .f5, .f6 { animation: none !important; }
  }
`

const TEST_USER = { usuario: 'admin', password: 'talleres123456' }

export default function LoginPage() {
  const { usuario, login } = useAuth()
  const navigate   = useNavigate()

  // Si ya hay una sesión activa (cookie + estado local vigentes), no tiene sentido
  // mostrar el form de nuevo — evita el 400 "Ya tienes una sesión activa" del backend.
  useEffect(() => {
    if (usuario) navigate('/app/punto-venta', { replace: true })
  }, [usuario, navigate])

  const [showPassword,  setShowPassword]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)
  const [form,          setForm]          = useState({ usuario: '', password: '' })

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
    const id = setTimeout(() => navigate('/app/punto-venta'), 1500)
    return () => clearTimeout(id)
  }, [success, navigate])

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); if (error) setError('') }
  const fillTestUser = () => { setForm(TEST_USER); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario || !form.password) { setError('Por favor completá todos los campos.'); return }
    setLoading(true); setError('')
    try {
      const res = await loginUsuario(form.usuario, form.password)
      login(mapUsuario(res.data.user))
      setSuccess(true)
    } catch (err) {
      // El backend rechaza el login si la cookie de sesión sigue viva. En ese caso
      // recuperamos el perfil con /auth/me y entramos igual (en vez de trabar al usuario).
      if (err.status === 400 && /sesión activa/i.test(err.message || '')) {
        const u = await getSesionActual()
        if (u) { login(mapUsuario(u)); setSuccess(true); return }
      }
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

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', px: 2, position: 'relative', overflow: 'hidden',
    }}>

      {/* Resplandor de fondo: mancha estática de marca */}
      <Box aria-hidden sx={(theme) => ({
        position: 'fixed', top: '-12%', right: '-10%', width: 480, height: 480, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${theme.vars.palette.primary.mainChannel} / 0.10) 0%, transparent 72%)`,
        pointerEvents: 'none',
      })} />

      <Box sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <Box className="anim-logo" sx={{ textAlign: 'center', mb: 4 }}>
          <Box className="logo-pulse" sx={(theme) => ({
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 60, height: 60, borderRadius: '18px',
            bgcolor: 'primary.main', mb: 2, boxShadow: theme.vars.palette.pc.liftPop,
          })}>
            <PhoneAndroid sx={{ color: 'primary.contrastText', fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            Punto <Box component="span" sx={{ color: 'primary.main' }}>Cell</Box>
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
            Sistema de Gestión Integral
          </Typography>
        </Box>

        {/* Card */}
        <Card className="anim-card" sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {success ? (
              <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CheckCircleOutline className="anim-success" sx={{ fontSize: 72, color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>¡Bienvenido de vuelta!</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Redirigiendo al sistema...</Typography>
                <CircularProgress size={20} sx={{ mt: 1 }} />
              </Box>
            ) : (
              <>
                <Box className="f0">
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.2px' }}>
                    Iniciar sesión
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                    Ingresá tus credenciales para continuar
                  </Typography>
                </Box>

                <Box className="f1">
                  <Box onClick={fillTestUser} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 2.5, borderRadius: '10px',
                    border: '1px dashed', borderColor: 'divider',
                    bgcolor: 'pc.accentSoft',
                    cursor: 'pointer', transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-1px)' },
                  }}>
                    <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 600, fontSize: '0.78rem' }}>
                      Usuario de prueba:
                    </Typography>
                    <Typography className="mono" variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                      admin / talleres123456
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.72rem', ml: 'auto' }}>
                      Completar →
                    </Typography>
                  </Box>
                </Box>

                {error && (
                  <Box className="f2">
                    <Alert severity="error" sx={{ mb: 2.5 }}>
                      {error}
                    </Alert>
                  </Box>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Box className="f3">
                    <TextField fullWidth label="Usuario" name="usuario" value={form.usuario} onChange={handleChange}
                      variant="outlined" size="medium" autoComplete="username"
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutline sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
                      sx={{ mb: 2.5 }} />
                  </Box>

                  <Box className="f4">
                    <TextField fullWidth label="Contraseña" name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password} onChange={handleChange}
                      variant="outlined" size="medium" autoComplete="current-password"
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ mb: 1 }} />
                  </Box>

                  <Box className="f5" sx={{ textAlign: 'right', mb: 3 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      onClick={() => navigate('/forgot-password')}
                      sx={{
                        color: 'primary.main', fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </Typography>
                  </Box>

                  <Box className="f6">
                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                      sx={{ borderRadius: '12px', fontSize: '1rem', py: 1.5 }}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Ingresar al sistema'}
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', px: 1 }}>Punto Cell © 2026</Typography>
                </Divider>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', lineHeight: 1.6 }}>
                  Acceso restringido al personal autorizado.<br />
                  Ante problemas de acceso, contactá al administrador.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        <Typography className="anim-footer" variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.disabled' }}>
          Proyecto final de carrera · Institución Cervantes
        </Typography>
      </Box>
    </Box>
  )
}

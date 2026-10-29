import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, Alert, CircularProgress,
} from '@mui/material'
import { PhoneAndroid, CheckCircleOutline, EmailOutlined, ArrowBack } from '@mui/icons-material'
import { olvideMiContrasena } from '../services/api'

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
  .f1 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.36s both; }
  .f2 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.44s both; }
  .f3 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.52s both; }
  .f4 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.60s both; }
  @media (prefers-reduced-motion: reduce) {
    .logo-pulse, .anim-logo, .anim-card, .anim-footer, .anim-success,
    .f0, .f1, .f2, .f3, .f4 { animation: none !important; }
  }
`

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [sent,      setSent]      = useState(false)

  useEffect(() => {
    const TAG_ID = 'pc-forgot-styles'
    if (document.getElementById(TAG_ID)) return
    const tag = document.createElement('style')
    tag.id = TAG_ID
    tag.textContent = STYLES
    document.head.appendChild(tag)
    return () => document.getElementById(TAG_ID)?.remove()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { setError('Por favor ingresá tu email.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('El formato del email no es válido.'); return }

    setLoading(true); setError('')
    try {
      await olvideMiContrasena(trimmed)
      setSent(true)
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud. Intentá más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', px: 2, position: 'relative', overflow: 'hidden',
    }}>

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
            {sent ? (
              /* ── Estado enviado ── */
              <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CheckCircleOutline className="anim-success" sx={{ fontSize: 72, color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ¡Correo enviado!
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300, lineHeight: 1.6 }}>
                  Si el email <Box component="strong" sx={{ color: 'text.primary' }}>{email}</Box> está registrado,
                  recibirás un enlace para restablecer tu contraseña.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Revisá también tu carpeta de spam.
                </Typography>
                <Button
                  onClick={() => navigate('/login')}
                  startIcon={<ArrowBack />}
                  sx={{ mt: 1, fontWeight: 600, color: 'primary.main', borderRadius: '10px', '&:hover': { bgcolor: 'pc.accentSoft' } }}
                >
                  Volver al inicio de sesión
                </Button>
              </Box>
            ) : (
              /* ── Formulario ── */
              <>
                <Box className="f0">
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.2px' }}>
                    Recuperar contraseña
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Ingresá tu email y te enviaremos un enlace para restablecerla.
                  </Typography>
                </Box>

                {error && (
                  <Box className="f1">
                    <Alert severity="error" sx={{ mb: 2.5 }}>
                      {error}
                    </Alert>
                  </Box>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Box className="f2">
                    <TextField
                      fullWidth
                      label="Correo electrónico"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                      variant="outlined"
                      size="medium"
                      autoComplete="email"
                      autoFocus
                      error={Boolean(email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))}
                      helperText={email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'El formato del email no es válido.' : ''}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ mb: 3 }}
                    />
                  </Box>

                  <Box className="f3">
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      sx={{ borderRadius: '12px', fontSize: '1rem', py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Enviar enlace de recuperación'}
                    </Button>
                  </Box>

                  <Box className="f4" sx={{ textAlign: 'center', mt: 3 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      onClick={() => navigate('/login')}
                      sx={{
                        color: 'primary.main', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      <ArrowBack sx={{ fontSize: 16 }} />
                      Volver al inicio de sesión
                    </Typography>
                  </Box>
                </Box>
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

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, LinearProgress,
} from '@mui/material'
import {
  PhoneAndroid, CheckCircleOutline,
  LockOutlined, LockReset, Visibility, VisibilityOff, ArrowBack,
  ErrorOutline,
} from '@mui/icons-material'
import { resetearContrasena } from '../services/api'

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
  .f5 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.68s both; }
  @media (prefers-reduced-motion: reduce) {
    .logo-pulse, .anim-logo, .anim-card, .anim-footer, .anim-success,
    .f0, .f1, .f2, .f3, .f4, .f5 { animation: none !important; }
  }
`

// ─── Medidor de fortaleza de contraseña ──────────────────────────────────────
// El color es un token de paleta (resuelto por sx contra el tema), no un hex:
// débil → error, aceptable → warning, fuerte/muy fuerte → primary (dos tonos).
const getPasswordStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', color: 'transparent' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { level: 20,  label: 'Muy débil',  color: 'error.main' }
  if (score === 2) return { level: 40,  label: 'Débil',      color: 'error.main' }
  if (score === 3) return { level: 60,  label: 'Aceptable',  color: 'warning.main' }
  if (score === 4) return { level: 80,  label: 'Fuerte',     color: 'primary.main' }
  return                  { level: 100, label: 'Muy fuerte', color: 'primary.dark' }
}

export default function ResetPasswordPage() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  // El token puede venir como ?token=xxx o ?Token=xxx
  const token = searchParams.get('token') || searchParams.get('Token') || ''

  const [showNew,        setShowNew]        = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [newPassword,    setNewPassword]    = useState('')
  const [confirmPwd,     setConfirmPwd]     = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [done,           setDone]           = useState(false)

  useEffect(() => {
    const TAG_ID = 'pc-reset-styles'
    if (document.getElementById(TAG_ID)) return
    const tag = document.createElement('style')
    tag.id = TAG_ID
    tag.textContent = STYLES
    document.head.appendChild(tag)
    return () => document.getElementById(TAG_ID)?.remove()
  }, [])

  // Redirige al login tras éxito
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => navigate('/login'), 3000)
    return () => clearTimeout(id)
  }, [done, navigate])

  const strength = getPasswordStrength(newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword) { setError('Ingresá la nueva contraseña.'); return }
    if (newPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (newPassword !== confirmPwd) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true); setError('')
    try {
      await resetearContrasena(token, newPassword)
      setDone(true)
    } catch (err) {
      setError(
        err.message?.toLowerCase().includes('token')
          ? 'El enlace es inválido o ya expiró. Solicitá uno nuevo.'
          : err.message || 'No se pudo restablecer la contraseña. Intentá de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ─── Sin token en la URL ──────────────────────────────────────────────────────
  const tokenInvalido = !token

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

            {/* ── Éxito ── */}
            {done ? (
              <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CheckCircleOutline className="anim-success" sx={{ fontSize: 72, color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ¡Contraseña actualizada!
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  Tu contraseña fue cambiada exitosamente.<br />
                  Serás redirigido al inicio de sesión...
                </Typography>
                <CircularProgress size={20} sx={{ mt: 1 }} />
              </Box>

            /* ── Token inválido / ausente ── */
            ) : tokenInvalido ? (
              <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <ErrorOutline sx={{ fontSize: 64, color: 'error.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Enlace inválido
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300, lineHeight: 1.6 }}>
                  Este enlace de recuperación no es válido o ya expiró. Solicitá uno nuevo desde la pantalla de login.
                </Typography>
                <Button
                  onClick={() => navigate('/forgot-password')}
                  startIcon={<ArrowBack />}
                  sx={{ mt: 1, fontWeight: 600, color: 'primary.main', borderRadius: '10px', '&:hover': { bgcolor: 'pc.accentSoft' } }}
                >
                  Solicitar nuevo enlace
                </Button>
              </Box>

            /* ── Formulario ── */
            ) : (
              <>
                <Box className="f0">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <LockReset sx={{ color: 'primary.main', fontSize: 26 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.2px' }}>
                      Nueva contraseña
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Elegí una contraseña segura para tu cuenta.
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
                  {/* Campo nueva contraseña */}
                  <Box className="f2">
                    <TextField
                      fullWidth
                      label="Nueva contraseña"
                      name="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }}
                      variant="outlined"
                      size="medium"
                      autoComplete="new-password"
                      autoFocus
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowNew(!showNew)} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                                {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ mb: 1.5 }}
                    />
                  </Box>

                  {/* Medidor de fortaleza */}
                  {newPassword && (
                    <Box sx={{ mb: 1.5, animation: 'fadeSlideUp 0.2s cubic-bezier(.22,1,.36,1) both' }}>
                      <LinearProgress
                        variant="determinate"
                        value={strength.level}
                        sx={{
                          height: 4, borderRadius: 4,
                          backgroundColor: 'pc.dividerSoft',
                          '& .MuiLinearProgress-bar': { backgroundColor: strength.color, borderRadius: 4 },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, mt: 0.5, display: 'block' }}>
                        {strength.label}
                      </Typography>
                    </Box>
                  )}

                  {/* Campo confirmar contraseña */}
                  <Box className="f4" sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Confirmar contraseña"
                      name="confirmPwd"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={(e) => { setConfirmPwd(e.target.value); if (error) setError('') }}
                      variant="outlined"
                      size="medium"
                      autoComplete="new-password"
                      error={!!confirmPwd && confirmPwd !== newPassword}
                      helperText={confirmPwd && confirmPwd !== newPassword ? 'Las contraseñas no coinciden' : ''}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                                {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ mb: 3 }}
                    />
                  </Box>

                  <Box className="f5">
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      sx={{ borderRadius: '12px', fontSize: '1rem', py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Guardar nueva contraseña'}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2.5 }}>
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

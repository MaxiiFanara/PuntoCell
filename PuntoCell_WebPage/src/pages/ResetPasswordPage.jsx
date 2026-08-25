import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, LinearProgress,
  Tooltip, createTheme, ThemeProvider, CssBaseline,
} from '@mui/material'
import {
  PhoneAndroid, LightMode, DarkMode, CheckCircleOutline,
  LockOutlined, LockReset, Visibility, VisibilityOff, ArrowBack,
  ErrorOutline,
} from '@mui/icons-material'
import { resetearContrasena } from '../services/api'

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
  .f1 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.36s both; }
  .f2 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.44s both; }
  .f3 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.52s both; }
  .f4 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.60s both; }
  .f5 { animation: fadeSlideUp 0.45s cubic-bezier(.22,1,.36,1) 0.68s both; }
`

// ─── Medidor de fortaleza de contraseña ──────────────────────────────────────
const getPasswordStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', color: 'transparent' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { level: 20, label: 'Muy débil', color: '#ef4444' }
  if (score === 2) return { level: 40, label: 'Débil',     color: '#f97316' }
  if (score === 3) return { level: 60, label: 'Aceptable', color: '#eab308' }
  if (score === 4) return { level: 80, label: 'Fuerte',    color: '#22c55e' }
  return                 { level: 100, label: 'Muy fuerte', color: '#16a34a' }
}

export default function ResetPasswordPage() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  // El token puede venir como ?token=xxx o ?Token=xxx
  const token = searchParams.get('token') || searchParams.get('Token') || ''

  const [darkMode,       setDarkMode]       = useState(false)
  const [iconKey,        setIconKey]        = useState(0)
  const [showNew,        setShowNew]        = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [newPassword,    setNewPassword]    = useState('')
  const [confirmPwd,     setConfirmPwd]     = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [done,           setDone]           = useState(false)
  const fabRef = useRef(null)

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

  // ─── Tokens de color ──────────────────────────────────────────────────────────
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
  const footerColor = isDark ? '#475569' : '#9ca3af'
  const blue        = '#2563eb'

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px', background: fieldBg,
      '& input': { color: titleColor },
      '&:hover .MuiOutlinedInput-notchedOutline':       { borderColor: blue },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: blue, borderWidth: '2px' },
    },
    '& .MuiInputLabel-root':             { color: subColor },
    '& .MuiInputLabel-root.Mui-focused': { color: blue },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#334155' : '#e5e7eb' },
  }

  // ─── Sin token en la URL ──────────────────────────────────────────────────────
  const tokenInvalido = !token

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bgGradient, px: 2, position: 'relative', overflow: 'hidden',
      }}>

        {/* Blobs */}
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

              {/* ── Éxito ── */}
              {done ? (
                <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CheckCircleOutline className="anim-success" sx={{ fontSize: 72, color: '#22c55e' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor }}>
                    ¡Contraseña actualizada!
                  </Typography>
                  <Typography variant="body2" sx={{ color: subColor, lineHeight: 1.6 }}>
                    Tu contraseña fue cambiada exitosamente.<br />
                    Serás redirigido al inicio de sesión...
                  </Typography>
                  <CircularProgress size={20} sx={{ color: blue, mt: 1 }} />
                </Box>

              /* ── Token inválido / ausente ── */
              ) : tokenInvalido ? (
                <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <ErrorOutline sx={{ fontSize: 64, color: '#ef4444' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor }}>
                    Enlace inválido
                  </Typography>
                  <Typography variant="body2" sx={{ color: subColor, maxWidth: 300, lineHeight: 1.6 }}>
                    Este enlace de recuperación no es válido o ya expiró. Solicitá uno nuevo desde la pantalla de login.
                  </Typography>
                  <Button
                    onClick={() => navigate('/forgot-password')}
                    startIcon={<ArrowBack />}
                    sx={{
                      mt: 1, textTransform: 'none', fontWeight: 600,
                      color: blue, borderRadius: '10px',
                      '&:hover': { background: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' },
                    }}
                  >
                    Solicitar nuevo enlace
                  </Button>
                </Box>

              /* ── Formulario ── */
              ) : (
                <>
                  <Box className="f0">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <LockReset sx={{ color: blue, fontSize: 26 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor, letterSpacing: '-0.2px' }}>
                        Nueva contraseña
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: subColor, mb: 3 }}>
                      Elegí una contraseña segura para tu cuenta.
                    </Typography>
                  </Box>

                  {error && (
                    <Box className="f1">
                      <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', fontSize: '0.85rem', '& .MuiAlert-icon': { fontSize: 18 } }}>
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
                                <LockOutlined sx={{ color: iconColor, fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowNew(!showNew)} edge="end" size="small" sx={{ color: iconColor }}>
                                  {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ mb: 1.5, ...inputSx }}
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
                            backgroundColor: isDark ? '#334155' : '#e5e7eb',
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
                                <LockOutlined sx={{ color: iconColor, fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small" sx={{ color: iconColor }}>
                                  {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ mb: 3, ...inputSx }}
                      />
                    </Box>

                    <Box className="f5">
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={loading}
                        sx={{
                          borderRadius: '12px', textTransform: 'none', fontWeight: 700,
                          fontSize: '1rem', py: 1.5,
                          background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)',
                          boxShadow: '0 4px 14px rgba(37,99,235,0.40)', transition: 'all 0.25s',
                          '&:hover': { background: 'linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%)', boxShadow: '0 6px 22px rgba(37,99,235,0.55)', transform: 'translateY(-1px)' },
                          '&:active': { transform: 'translateY(0px)' },
                          '&.Mui-disabled': { background: isDark ? '#1e293b' : '#e5e7eb', boxShadow: 'none' },
                        }}
                      >
                        {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Guardar nueva contraseña'}
                      </Button>

                      <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                        <Typography
                          component="span"
                          variant="body2"
                          onClick={() => navigate('/login')}
                          sx={{
                            color: blue, fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
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

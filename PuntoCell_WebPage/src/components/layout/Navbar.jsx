import { useState, useEffect } from 'react'
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Divider, Tooltip, TextField, InputAdornment } from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useVenta } from '../../features/punto-venta/context/VentaContext'
import { useDolarOficial } from '../../hooks/useDolarOficial'

const fmtPeso = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const ROL_CONFIG = {
  1: { label: 'Admin',     color: '#f59e0b', bg: '#fffbeb' },
  2: { label: 'Encargado', color: '#22c55e', bg: '#f0fdf4' },
  3: { label: 'Atención',  color: '#3b82f6', bg: '#eff6ff' },
  4: { label: 'Técnico',   color: '#8b5cf6', bg: '#f5f3ff' },
}

const NavLink = ({ label, active, onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
    sx={{
      px: 1.5, py: 0.6,
      borderRadius: 2,
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: 600,
      color: active ? '#f1f5f9' : '#64748b',
      backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      transition: 'color 0.15s, background-color 0.15s',
      userSelect: 'none',
      '&:hover': {
        color: active ? '#f1f5f9' : '#cbd5e1',
        backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
      },
    }}
  >
    {label}
  </Box>
)

const Navbar = () => {
  const { usuario, cerrarSesion } = useAuth()
  const { dolarGlobal, actualizarCotizacion } = useVenta()
  const { dato: dolarOficial } = useDolarOficial()
  const navigate = useNavigate()
  const location = useLocation()
  const rol = ROL_CONFIG[usuario?.rol] ?? ROL_CONFIG[3]
  const iniciales = usuario?.user
    ? usuario.user.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const esAdminOEncargado = usuario?.rol === 1 || usuario?.rol === 2

  const [montoDolar, setMontoDolar] = useState('')
  const [guardandoDolar, setGuardandoDolar] = useState(false)
  const [editandoDolar, setEditandoDolar] = useState(false)

  // Se sincroniza con el valor real (carga inicial o cambios propios) — pero NO
  // mientras el usuario está escribiendo, para no pisarle lo que tipeó si el
  // fetch inicial resuelve justo en ese momento.
  useEffect(() => {
    if (editandoDolar) return
    setMontoDolar(dolarGlobal ? String(dolarGlobal) : '')
  }, [dolarGlobal, editandoDolar])

  const guardarDolar = async () => {
    setEditandoDolar(false)
    if (guardandoDolar || Number(montoDolar) === dolarGlobal) return
    setGuardandoDolar(true)
    try {
      await actualizarCotizacion(montoDolar)
    } catch (err) {
      alert('❌ ' + (err.message || 'No se pudo actualizar el valor del dólar.'))
      setMontoDolar(dolarGlobal ? String(dolarGlobal) : '')
    } finally {
      setGuardandoDolar(false)
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 1201,
      }}
    >
      <Toolbar sx={{ minHeight: 68, gap: 2, px: { xs: 2, sm: 4 } }}>

        

        <Box sx={{ flex: 1 }} />

        {/* Dólar oficial (referencia, dolarapi.com) — solo lectura, no toca la cotización operativa */}
        {dolarOficial && (
          <Tooltip title={`Dólar oficial de referencia (dolarapi.com)${dolarOficial.fechaActualizacion ? ` · actualizado ${new Date(dolarOficial.fechaActualizacion).toLocaleString('es-AR')}` : ''}`}>
            <Box sx={{
              display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1,
              px: 1.5, py: 0.6, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              whiteSpace: 'nowrap',
            }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Oficial
              </Typography>
              <Typography sx={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}>
                Compra <Box component="span" sx={{ color: '#f1f5f9', fontWeight: 800 }}>${fmtPeso(dolarOficial.compra)}</Box>
                {'  ·  '}
                Venta <Box component="span" sx={{ color: '#f1f5f9', fontWeight: 800 }}>${fmtPeso(dolarOficial.venta)}</Box>
              </Typography>
            </Box>
          </Tooltip>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <BuildIcon sx={{ fontSize: '1.1rem', verticalAlign: 'middle', mr: 0.5, color: '#facc15' }} />
            Valor Dólar
          </Typography>
          <Tooltip title="Editá y presioná Enter para actualizar. Recalcula los precios en todo el sistema.">
            <TextField
              name="montoDolar" type="number" size="small" sx={{ width: 120, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start" sx={{ color: '#facc15' }}>$</InputAdornment>,
                sx: { color: '#000000' },
              }}
              disabled={guardandoDolar}
              value={montoDolar}
              onFocus={() => setEditandoDolar(true)}
              onChange={(e) => setMontoDolar(e.target.value)}
              onBlur={guardarDolar}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
          </Tooltip>
        </Box>

        {/* User zone */}
        {usuario && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Rol badge */}
            <Box sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.75,
              px: 1.5, py: 0.6,
              borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: rol.color, flexShrink: 0 }} />
              <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                {rol.label}
              </Typography>
            </Box>

            {/* Name */}
            <Typography sx={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              {usuario.user}
            </Typography>

            {/* Avatar */}
            <Tooltip title={`${usuario.user} · ${rol.label}`}>
              <Avatar sx={{
                width: 36, height: 36, fontSize: '0.8rem', fontWeight: 800, cursor: 'default',
                background: `linear-gradient(135deg, ${rol.color}bb, ${rol.color})`,
                border: '2px solid rgba(255,255,255,0.14)',
                letterSpacing: '-0.01em',
              }}>
                {iniciales}
              </Avatar>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 0.25 }} />

            {/* Logout */}
            <Tooltip title="Cerrar sesión">
              <Button
                size="small"
                onClick={cerrarSesion}
                startIcon={<LogoutIcon sx={{ fontSize: '15px !important' }} />}
                sx={{
                  color: '#64748b', borderRadius: 2, px: 1.5, py: 0.75,
                  fontSize: '0.78rem', fontWeight: 600, minWidth: 0,
                  '&:hover': { color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.07)' },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Salir</Box>
              </Button>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Navbar

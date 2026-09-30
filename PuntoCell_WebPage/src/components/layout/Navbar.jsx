import { useState, useEffect } from 'react'
import { Box, Button, IconButton, TextField, Tooltip } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import { useAuth } from '../../context/AuthContext'
import { useVenta } from '../../features/punto-venta/context/VentaContext'
import { useDolarOficial } from '../../hooks/useDolarOficial'

const fmtPeso = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Topbar de 52px del nuevo diseño. La identidad del usuario vive en el rail
// (AppLayout); acá quedan la cotización operativa (editable), el dólar oficial
// de referencia (infodolar/dolarapi, solo lectura) y la salida.
const Navbar = ({ onAbrirMenu, onAbrirAyuda }) => {
  const { usuario, cerrarSesion } = useAuth()
  const { dolarGlobal, actualizarCotizacion } = useVenta()
  const { dato: dolarOficial } = useDolarOficial()

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
    <Box
      component="header"
      sx={{
        flex: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        minHeight: 52,
        py: 0.75,
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.25,
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <IconButton
        onClick={onAbrirMenu}
        size="small"
        sx={{ display: { lg: 'none' }, mr: 'auto' }}
        aria-label="Abrir menú"
      >
        <MenuIcon fontSize="small" />
      </IconButton>

      {/* Dólar oficial de referencia (dolarapi.com) — solo lectura, no toca la cotización operativa */}
      {dolarOficial && (
        <Tooltip title={`Dólar oficial de referencia (dolarapi.com)${dolarOficial.fechaActualizacion ? ` · actualizado ${new Date(dolarOficial.fechaActualizacion).toLocaleString('es-AR')}` : ''}`}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1,
              px: 1.25, py: 0.6, borderRadius: '8px',
              bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider',
              whiteSpace: 'nowrap',
            }}
          >
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Oficial</Box>
            <Box className="mono" sx={{ fontSize: '.78rem', fontWeight: 600, color: 'text.secondary' }}>
              Compra <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>${fmtPeso(dolarOficial.compra)}</Box>
              {'  ·  '}
              Venta <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>${fmtPeso(dolarOficial.venta)}</Box>
            </Box>
          </Box>
        </Tooltip>
      )}

      <Tooltip title="Editá y presioná Enter. Recalcula los precios en todo el sistema.">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.125,
            bgcolor: 'pc.surfaceMuted',
            border: 1,
            borderColor: 'divider',
            borderRadius: '8px',
            p: '4px 4px 4px 11px',
          }}
        >
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            Dólar hoy
          </Box>
          <TextField
            name="montoDolar"
            type="number"
            size="small"
            aria-label="Valor del dólar"
            sx={{ width: 90, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
            slotProps={{ input: { className: 'mono' } }}
            disabled={guardandoDolar}
            value={montoDolar}
            onFocus={() => setEditandoDolar(true)}
            onChange={(e) => setMontoDolar(e.target.value)}
            onBlur={guardarDolar}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        </Box>
      </Tooltip>

      {usuario && (
        <Tooltip title="Abrir asistente de usuario">
          <Button
            variant="outlined"
            onClick={onAbrirAyuda}
            startIcon={<HelpOutlineOutlinedIcon sx={{ fontSize: '16px !important' }} />}
            sx={{
              minWidth: { xs: 40, sm: 'auto' },
              px: { xs: 1, sm: 1.5 },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } },
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Ayuda</Box>
          </Button>
        </Tooltip>
      )}

      {usuario && (
        <Button onClick={cerrarSesion} startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />}>
          Salir
        </Button>
      )}
    </Box>
  )
}

export default Navbar

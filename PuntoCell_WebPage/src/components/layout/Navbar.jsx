import { useState, useEffect } from 'react'
import { Box, Button, IconButton, TextField, Tooltip } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../../context/AuthContext'
import { useVenta } from '../../features/punto-venta/context/VentaContext'

// Topbar de 52px del mockup. La identidad del usuario vive en el rail
// (AppLayout), acá quedan solo la cotización del día y la salida.
const Navbar = ({ onAbrirMenu }) => {
  const { usuario, cerrarSesion } = useAuth()
  const { dolarGlobal, actualizarCotizacion } = useVenta()

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
        height: 52,
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.25,
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
            className="mono"
            aria-label="Valor del dólar"
            sx={{ width: 86, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
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
        <Button onClick={cerrarSesion} startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />}>
          Salir
        </Button>
      )}
    </Box>
  )
}

export default Navbar

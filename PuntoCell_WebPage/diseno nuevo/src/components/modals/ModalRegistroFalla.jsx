import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress,
  Typography, IconButton, Box,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { crearFalla } from '../../services/api'

const MAX_LEN = 50
// Solo letras (con acentos/ñ) y espacios — nada de números ni caracteres especiales.
const SOLO_LETRAS = /[^A-Za-zÀ-ÿ\s]/g

const ModalRegistroFalla = ({ open, onClose, idCategoria, categoriaNombre, onFallaGuardada }) => {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) { setNombre(''); setError(''); setSuccess(false) }
  }, [open])

  const handleNombreChange = (e) => {
    const value = e.target.value.replace(SOLO_LETRAS, '').slice(0, MAX_LEN)
    setNombre(value)
  }

  const handleGuardar = async () => {
    const limpio = nombre.trim()
    if (limpio.length < 3) { setError('El nombre de la falla debe tener al menos 3 letras.'); return }
    if (!idCategoria) { setError('Seleccioná primero un tipo de dispositivo.'); return }

    setError(''); setLoading(true)
    try {
      const res = await crearFalla(Number(idCategoria), limpio)
      const nueva = { id: res?.data?.Id, nombre: limpio }
      setSuccess(true)
      onFallaGuardada?.(nueva)
      setTimeout(onClose, 1200)
    } catch (e) {
      setError(e.message || 'Error al guardar la falla.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Agregar falla al catálogo
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            {categoriaNombre ? `Para: ${categoriaNombre}` : 'Seleccioná un tipo de dispositivo'}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {error   && <Alert severity="error"   onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success">¡Falla agregada al catálogo!</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Nombre de la falla</Box>
            <TextField
              fullWidth value={nombre} onChange={handleNombreChange}
              placeholder="Ej: Pantalla rota, No enciende, Batería agotada…"
              helperText={`${nombre.length}/${MAX_LEN} caracteres — solo letras`}
            />
          </Box>

          <Box sx={{ p: '11px 13px', borderRadius: '9px', bgcolor: 'warning.light', color: 'warning.main' }}>
            <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: 'inherit' }}>
              Esta falla quedará disponible para elegir en órdenes de {categoriaNombre || 'este tipo de dispositivo'}.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}>
          {loading ? 'Guardando…' : 'Guardar falla'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroFalla

import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress,
  Typography, IconButton, Box, Paper,
} from '@mui/material'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #92400e, #d97706)', color: '#fff', display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 3 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ReportProblemIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Agregar falla al catálogo</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>
            {categoriaNombre ? `Para: ${categoriaNombre}` : 'Seleccioná un tipo de dispositivo'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        {(error || success) && (
          <Box sx={{ px: 3, pt: 2.5 }}>
            {error   && <Alert severity="error"   onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ borderRadius: 2 }}>¡Falla agregada al catálogo!</Alert>}
          </Box>
        )}

        <Box sx={{ p: 3 }}>
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <TextField
              fullWidth label="Nombre de la falla *" value={nombre} onChange={handleNombreChange}
              placeholder="Ej: Pantalla rota, No enciende, Batería agotada…"
              helperText={`${nombre.length}/${MAX_LEN} caracteres — solo letras`}
            />
            <Box sx={{ mt: 2.5, p: 1.75, borderRadius: 2, background: 'linear-gradient(135deg, #fef3c7, #fffbeb)', border: '1.5px solid #fde68a' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
                💡 Esta falla quedará disponible para elegir en órdenes de {categoriaNombre || 'este tipo de dispositivo'}.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ borderColor: '#e2e8f0', color: '#475569' }}>Cancelar</Button>
        <Button variant="contained" color="warning" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          sx={{ minWidth: 180 }}>
          {loading ? 'Guardando…' : 'Guardar Falla'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroFalla

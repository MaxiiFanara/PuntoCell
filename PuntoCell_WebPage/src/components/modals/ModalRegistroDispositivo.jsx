import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress,
  Typography, IconButton, Box, Paper, MenuItem, Grid,
} from '@mui/material'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { crearModeloArticulo } from '../../services/api'

const EMPTY = { idTipo: '', idMarca: '', nombre: '' }

const ModalRegistroDispositivo = ({ open, onClose, tipos, marcas, onDispositivoGuardado }) => {
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) { setForm(EMPTY); setError(''); setSuccess(false) }
  }, [open])

  const set = (f) => (e) => setForm((prev) => {
    const next = { ...prev, [f]: e.target.value }
    if (f === 'idTipo') next.idMarca = ''
    return next
  })

  const validar = () => {
    if (!form.idTipo)        return 'Seleccioná un tipo.'
    if (!form.idMarca)       return 'Seleccioná una marca.'
    if (!form.nombre.trim()) return 'Ingresá el nombre o modelo.'
    return null
  }

  const handleGuardar = async () => {
    const err = validar(); if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      const res = await crearModeloArticulo({
        Nombre:             form.nombre.trim(),
        IdMarcaArticulo:    Number(form.idMarca),
        IdCategoriaArticulo: Number(form.idTipo),
      })
      setSuccess(true)
      onDispositivoGuardado?.({ ...form, id: res?.data?.Id, nombre: form.nombre })
      setTimeout(onClose, 1500)
    } catch (e) { setError(e.message || 'Error al guardar el dispositivo.') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #0c4a6e, #0284c7)', color: '#fff', display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 3 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PhoneAndroidIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Registrar Dispositivo</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>Ingresá los datos del nuevo modelo</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        {(error || success) && (
          <Box sx={{ px: 3, pt: 2.5 }}>
            {error   && <Alert severity="error"   onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ borderRadius: 2 }}>¡Dispositivo registrado!</Alert>}
          </Box>
        )}

        <Box sx={{ p: 3 }}>
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Tipo de dispositivo *" value={form.idTipo} onChange={set('idTipo')}>
                  <MenuItem value="">Seleccione…</MenuItem>
                  {tipos.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </TextField>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.75 }}>Ej: Celular, Tablet, Notebook</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Marca *" value={form.idMarca} onChange={set('idMarca')} disabled={!form.idTipo}>
                  <MenuItem value="">Seleccione…</MenuItem>
                  {(marcas ?? []).map((m) => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
                </TextField>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.75 }}>Ej: Samsung, Apple, Motorola</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Nombre / Modelo *" placeholder="Ej: Galaxy S24, iPhone 15 Pro, Moto G85…"
                  value={form.nombre} onChange={set('nombre')} />
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.75 }}>Ingresá el modelo específico del dispositivo</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2.5, p: 1.75, borderRadius: 2, background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)', border: '1.5px solid #7dd3fc' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                💡 El dispositivo quedará disponible para seleccionar al crear nuevas órdenes de reparación.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ borderColor: '#e2e8f0', color: '#475569' }}>Cancelar</Button>
        <Button variant="contained" color="info" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          sx={{ minWidth: 180 }}>
          {loading ? 'Guardando…' : 'Guardar Dispositivo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroDispositivo

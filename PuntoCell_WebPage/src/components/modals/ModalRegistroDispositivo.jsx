import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress,
  Typography, IconButton, Box, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { crearModeloArticulo } from '../../services/api'

const EMPTY = { idTipo: '', idMarca: '', nombre: '' }

const Campo = ({ label, hint, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
    {hint && <Typography sx={{ fontSize: '.69rem', color: 'text.disabled' }}>{hint}</Typography>}
  </Box>
)

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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Registrar dispositivo
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            Ingresá los datos del nuevo modelo
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {error   && <Alert severity="error"   onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success">¡Dispositivo registrado!</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1.5 }}>
            <Campo label="Tipo de dispositivo" hint="Ej: Celular, Tablet, Notebook">
              <TextField fullWidth select value={form.idTipo} onChange={set('idTipo')}>
                <MenuItem value="">Seleccione…</MenuItem>
                {tipos.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </TextField>
            </Campo>
            <Campo label="Marca" hint="Ej: Samsung, Apple, Motorola">
              <TextField fullWidth select value={form.idMarca} onChange={set('idMarca')} disabled={!form.idTipo}>
                <MenuItem value="">Seleccione…</MenuItem>
                {(marcas ?? []).map((m) => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
              </TextField>
            </Campo>
            <Box sx={{ gridColumn: 'span 2' }}>
              <Campo label="Nombre / modelo" hint="Ingresá el modelo específico del dispositivo">
                <TextField fullWidth placeholder="Ej: Galaxy S24, iPhone 15 Pro, Moto G85…"
                  value={form.nombre} onChange={set('nombre')} />
              </Campo>
            </Box>
          </Box>

          <Box sx={{ p: '11px 13px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main' }}>
            <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: 'inherit' }}>
              El dispositivo quedará disponible para seleccionar al crear nuevas órdenes de reparación.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}>
          {loading ? 'Guardando…' : 'Guardar dispositivo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroDispositivo

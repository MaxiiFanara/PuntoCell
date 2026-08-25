import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Alert, Typography, CircularProgress,
  IconButton, Box, Paper, MenuItem, Divider,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import ContactPhoneIcon from '@mui/icons-material/ContactPhone'
import { crearCliente } from '../../services/api'
import { soloLetrasYEspacios, soloDigitos, soloEnteroEnRango } from '../../utils/validators'
import { capitalizar } from '../../utils/format'

const EMPTY = { DNI: '', Nombre: '', Apellido: '', Email: '', Celular: '', Calle: '', Numero: '', Piso: '', Depto: '', IdLocalidad: '' }

const SeccionHeader = ({ icon: Icon, title, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
    <Box sx={{ width: 30, height: 30, borderRadius: 1.5, backgroundColor: `${color}18`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ fontSize: 15, color }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{title}</Typography>
  </Box>
)

const ModalRegistroCliente = ({ open, onClose, localidades, dniInicial = '', onClienteGuardado }) => {
  const [form, setForm]     = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) { setForm({ ...EMPTY, DNI: dniInicial }); setError(''); setSuccess(false) }
  }, [open, dniInicial])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  // Filtra caracteres en tiempo real (no espera al submit para avisar)
  const setSoloDigitos = (f, maxLen) => (e) =>
    setForm((prev) => ({ ...prev, [f]: soloDigitos(e.target.value, maxLen) }))
  const setSoloLetras = (f) => (e) =>
    setForm((prev) => ({ ...prev, [f]: soloLetrasYEspacios(e.target.value, 25) }))
  const setNumero = (f) => (e) =>
    setForm((prev) => ({ ...prev, [f]: soloEnteroEnRango(e.target.value, 1, 9999) }))

  const validar = () => {
    if (!form.DNI || !/^\d{7,8}$/.test(form.DNI))                              return 'DNI inválido (7 u 8 dígitos).'
    if (!form.Nombre.trim())                                                     return 'El nombre es obligatorio.'
    if (form.Nombre.trim().length > 25)                                          return 'El nombre no puede superar los 25 caracteres.'
    if (!form.Apellido.trim())                                                   return 'El apellido es obligatorio.'
    if (form.Apellido.trim().length > 25)                                        return 'El apellido no puede superar los 25 caracteres.'
    if (!form.Email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Email))   return 'Email inválido.'
    if (!/^\d{10,11}$/.test(form.Celular))                                       return 'El celular debe tener 10 u 11 dígitos.'
    if (!form.IdLocalidad)                                                        return 'Seleccioná una localidad.'
    return null
  }

  const handleGuardar = async () => {
    const err = validar(); if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      const res = await crearCliente(form)
      const clienteCreado = res?.data || res
      setSuccess(true)
      onClienteGuardado?.(clienteCreado)
      setTimeout(onClose, 1500)
    } catch (e) { setError(e.message || 'Error al guardar el cliente.') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 3 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PersonAddIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Registrar Nuevo Cliente</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>Completá los datos del cliente</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        {(error || success) && (
          <Box sx={{ px: 3, pt: 2.5 }}>
            {error   && <Alert severity="error"   onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ borderRadius: 2 }}>¡Cliente registrado correctamente!</Alert>}
          </Box>
        )}

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Datos personales */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <SeccionHeader icon={PersonIcon} title="Datos personales" color="#2563eb" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="DNI *" value={form.DNI} onChange={setSoloDigitos('DNI', 8)}
                  inputProps={{ readOnly: !!dniInicial, maxLength: 8, inputMode: 'numeric' }}
                  sx={dniInicial ? { '& .MuiOutlinedInput-root': { backgroundColor: '#f1f5f9' } } : {}}
                  helperText="7 u 8 dígitos numéricos"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Nombre *" value={form.Nombre} onChange={setSoloLetras('Nombre')} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Apellido *" value={form.Apellido} onChange={setSoloLetras('Apellido')} />
              </Grid>
            </Grid>
          </Paper>

          {/* Contacto */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <SeccionHeader icon={ContactPhoneIcon} title="Información de contacto" color="#059669" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email *" type="email" value={form.Email} onChange={set('Email')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Celular *" value={form.Celular} onChange={setSoloDigitos('Celular', 11)}
                  inputProps={{ inputMode: 'numeric' }}
                  helperText="10 u 11 dígitos" placeholder="Ej: 3512345678" />
              </Grid>
            </Grid>
          </Paper>

          {/* Dirección */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <SeccionHeader icon={HomeIcon} title="Dirección (opcional)" color="#7c3aed" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5}>
                <TextField fullWidth label="Calle" value={form.Calle} onChange={set('Calle')} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth label="Número" value={form.Numero} onChange={setNumero('Numero')}
                  inputProps={{ inputMode: 'numeric' }} helperText="1-9999" />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth label="Piso" value={form.Piso} onChange={setSoloDigitos('Piso', 6)}
                  inputProps={{ inputMode: 'numeric' }} />
              </Grid>
              <Grid item xs={4} sm={3}>
                <TextField fullWidth label="Depto" value={form.Depto} onChange={set('Depto')} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth select label="Localidad *" value={form.IdLocalidad} onChange={set('IdLocalidad')}
                  slotProps={{
                    select: {
                      // El valor elegido se veía cortado: el Select recortaba el texto al ancho
                      // de la columna. Con MenuProps + displayEmpty el menú desplegado puede ser
                      // más ancho que el input y el texto no se trunca con ellipsis.
                      MenuProps: { PaperProps: { style: { maxHeight: 320 } } },
                      sx: { '& .MuiSelect-select': { whiteSpace: 'normal', textOverflow: 'unset' } },
                    },
                  }}
                >
                  <MenuItem value="">Seleccione…</MenuItem>
                  {localidades.map((l) => <MenuItem key={l.id} value={l.id} sx={{ whiteSpace: 'normal' }}>{capitalizar(l.nombre)}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </Paper>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ borderColor: '#e2e8f0', color: '#475569' }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          sx={{ minWidth: 160 }}>
          {loading ? 'Guardando…' : 'Guardar Cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroCliente

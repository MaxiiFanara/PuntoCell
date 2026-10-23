import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress,
  IconButton, Box, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { crearCliente } from '../../services/api'
import { soloLetrasYEspacios, soloDigitos, soloEnteroEnRango } from '../../utils/validators'
import { capitalizar } from '../../utils/format'

const EMPTY = { DNI: '', Nombre: '', Apellido: '', Email: '', Celular: '', Calle: '', Numero: '', Piso: '', Depto: '', IdLocalidad: '' }

const Campo = ({ label, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, ...sx }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
  </Box>
)

const Seccion = ({ titulo, children }) => (
  <Box sx={{
    display: 'flex', flexDirection: 'column', gap: 1.25,
    p: '13px 15px', borderRadius: '9px',
    bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider',
  }}>
    <Box sx={{ typography: 'eyebrow', color: 'text.secondary' }}>{titulo}</Box>
    {children}
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Registrar cliente
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            Completá los datos para darlo de alta
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {error   && <Alert severity="error"   onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success">¡Cliente registrado correctamente!</Alert>}

          <Seccion titulo="Datos personales">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 1.25 }}>
              <Campo label="DNI">
                <TextField fullWidth value={form.DNI} onChange={setSoloDigitos('DNI', 8)}
                  slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }}
                  helperText="7 u 8 dígitos"
                />
              </Campo>
              <Campo label="Nombre">
                <TextField fullWidth value={form.Nombre} onChange={setSoloLetras('Nombre')} />
              </Campo>
              <Campo label="Apellido">
                <TextField fullWidth value={form.Apellido} onChange={setSoloLetras('Apellido')} />
              </Campo>
            </Box>
          </Seccion>

          <Seccion titulo="Contacto">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1.25 }}>
              <Campo label="Email">
                <TextField fullWidth type="email" value={form.Email} onChange={set('Email')} />
              </Campo>
              <Campo label="Celular">
                <TextField fullWidth value={form.Celular} onChange={setSoloDigitos('Celular', 11)}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  helperText="10 u 11 dígitos" placeholder="Ej: 3512345678" />
              </Campo>
            </Box>
          </Seccion>

          <Seccion titulo="Dirección (opcional)">
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 1.25 }}>
              <Campo label="Calle">
                <TextField fullWidth value={form.Calle} onChange={set('Calle')} />
              </Campo>
              <Campo label="Número">
                <TextField fullWidth value={form.Numero} onChange={setNumero('Numero')}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }} helperText="1-9999" />
              </Campo>
              <Campo label="Piso">
                <TextField fullWidth value={form.Piso} onChange={setSoloDigitos('Piso', 6)}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
              </Campo>
              <Campo label="Depto">
                <TextField fullWidth value={form.Depto} onChange={set('Depto')} />
              </Campo>
            </Box>
            <Campo label="Localidad">
              <TextField
                fullWidth select value={form.IdLocalidad} onChange={set('IdLocalidad')}
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
            </Campo>
          </Seccion>

        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={loading || success}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}>
          {loading ? 'Guardando…' : 'Guardar cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalRegistroCliente

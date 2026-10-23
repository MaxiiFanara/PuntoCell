import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box,
  Alert, CircularProgress, IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import CloseIcon from '@mui/icons-material/Close'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BadgeIcon from '@mui/icons-material/Badge'
import { getClienteByDNI } from '../../services/api'
import { soloDigitos } from '../../utils/validators'
import { capitalizar } from '../../utils/format'
import StatusPill from '../ui/StatusPill'

const Campo = ({ label, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, ...sx }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
  </Box>
)

const InfoFila = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
    <Box sx={{
      width: 26, height: 26, borderRadius: '7px', bgcolor: 'pc.surfaceMuted',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon sx={{ fontSize: 14, color: 'text.disabled' }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>
      <Typography sx={{ fontSize: '.8125rem', fontWeight: 600, color: value ? 'text.primary' : 'text.disabled' }}>
        {value || '—'}
      </Typography>
    </Box>
  </Box>
)

const ModalBuscarCliente = ({ open, onClose }) => {
  const [dni, setDni]         = useState('')
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [buscado, setBuscado] = useState(false)

  const reset = () => { setDni(''); setCliente(null); setError(''); setBuscado(false) }

  const handleClose = () => { reset(); onClose() }

  const buscar = async () => {
    const t = dni.trim()
    if (!t) return
    if (!/^\d{7,8}$/.test(t)) { setError('El DNI debe tener 7 u 8 dígitos.'); return }
    setLoading(true); setError(''); setCliente(null); setBuscado(false)
    try {
      const res = await getClienteByDNI(t)
      setCliente(res); setBuscado(true)
      if (!res) setError(`No se encontró ningún cliente con DNI ${t}.`)
    } catch (e) { setError(e.message || 'Error en la búsqueda. Intentá de nuevo.') }
    finally { setLoading(false) }
  }

  const iniciales = cliente
    ? ((cliente.Nombre?.[0] || '') + (cliente.Apellido?.[0] || '')).toUpperCase()
    : ''

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Buscar cliente
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            Consultá datos registrados por DNI
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Campo label="DNI" sx={{ flex: 1 }}>
              <TextField
                fullWidth placeholder="Ej: 30123456"
                value={dni}
                onChange={(e) => { setDni(soloDigitos(e.target.value, 8)); setError(''); setBuscado(false); setCliente(null) }}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }}
              />
            </Campo>
            <Button
              variant="contained"
              onClick={buscar}
              disabled={loading || !dni.trim()}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon sx={{ fontSize: 16 }} />}
              sx={{ height: 32 }}
            >
              {loading ? 'Buscando…' : 'Buscar'}
            </Button>
          </Box>

          {buscado && !loading && (
            <Button size="small" onClick={reset} sx={{ alignSelf: 'flex-start', color: 'text.disabled' }}>
              Buscar otro cliente
            </Button>
          )}

          {error && !loading && (
            <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>
          )}

          {cliente && buscado && (
            <Box sx={{ borderRadius: '9px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ p: '13px 15px', bgcolor: 'pc.accentSoft', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 42, height: 42, borderRadius: '9px', flexShrink: 0,
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '.95rem', letterSpacing: '-.02em' }}>{iniciales}</Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: 'text.primary', lineHeight: 1.2 }}>
                    {capitalizar(cliente.Apellido)}, {capitalizar(cliente.Nombre)}
                  </Typography>
                  <StatusPill tone="ok" label="Cliente registrado" sx={{ mt: 0.5 }} />
                </Box>
              </Box>

              <Box sx={{
                p: '15px', bgcolor: 'background.paper',
                display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1.5,
              }}>
                <InfoFila icon={BadgeIcon} label="DNI" value={cliente.DNI || dni} />
                <InfoFila icon={PhoneIcon} label="Celular" value={cliente.Celular} />
                <Box sx={{ gridColumn: 'span 2' }}>
                  <InfoFila icon={EmailIcon} label="Email" value={cliente.Email} />
                </Box>
                {(cliente.Calle || cliente.Numero) && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <InfoFila
                      icon={LocationOnIcon}
                      label="Dirección"
                      value={[cliente.Calle, cliente.Numero, cliente.Piso && `Piso ${cliente.Piso}`, cliente.Depto && `Dpto ${cliente.Depto}`].filter(Boolean).join(' ')}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {!buscado && !loading && !error && (
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
              <PersonSearchIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>
                Ingresá un DNI para comenzar
              </Typography>
              <Typography sx={{ fontSize: '.72rem', color: 'text.disabled' }}>
                Presioná Enter o hacé clic en Buscar
              </Typography>
            </Box>
          )}

        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalBuscarCliente

import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Paper,
  Alert, CircularProgress, IconButton, Grid, Divider,
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

const InfoFila = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ width: 28, height: 28, borderRadius: 1.5, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
      <Icon sx={{ fontSize: 14, color: '#64748b' }} />
    </Box>
    <Box>
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1, mb: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
        {value || <span style={{ color: '#cbd5e1' }}>–</span>}
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 3 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PersonSearchIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Buscar Cliente</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>Consultá datos por DNI</Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Buscador */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mb: 2, fontWeight: 500 }}>
              Ingresá el DNI del cliente para consultar sus datos registrados en el sistema.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                label="DNI" placeholder="Ej: 30123456"
                value={dni}
                onChange={(e) => { setDni(soloDigitos(e.target.value, 8)); setError(''); setBuscado(false); setCliente(null) }}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                inputProps={{ maxLength: 8, inputMode: 'numeric' }}
                sx={{ width: 180 }}
              />
              <Button
                variant="contained"
                onClick={buscar}
                disabled={loading || !dni.trim()}
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                sx={{ height: 40, minWidth: 110 }}
              >
                {loading ? 'Buscando…' : 'Buscar'}
              </Button>
              {buscado && !loading && (
                <Button size="small" onClick={reset} sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Nueva búsqueda
                </Button>
              )}
            </Box>
          </Paper>

          {/* Error */}
          {error && !loading && (
            <Alert severity="warning" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>
          )}

          {/* Resultado */}
          {cliente && buscado && (
            <Paper elevation={0} sx={{ border: '1.5px solid #6ee7b7', borderRadius: 2.5, overflow: 'hidden' }}>
              {/* Header resultado */}
              <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 52, height: 52, borderRadius: 3, flexShrink: 0,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                    {iniciales}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {capitalizar(cliente.Apellido)}, {capitalizar(cliente.Nombre)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <Typography sx={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                      Cliente registrado
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderColor: '#a7f3d0' }} />

              {/* Datos */}
              <Box sx={{ p: 2.5, backgroundColor: '#fff' }}>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoFila icon={BadgeIcon}   label="DNI"     value={cliente.DNI || dni} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoFila icon={PhoneIcon}   label="Celular" value={cliente.Celular} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <InfoFila icon={EmailIcon}   label="Email"   value={cliente.Email} />
                  </Grid>
                  {(cliente.Calle || cliente.Numero) && (
                    <Grid size={{ xs: 12 }}>
                      <InfoFila
                        icon={LocationOnIcon}
                        label="Dirección"
                        value={[cliente.Calle, cliente.Numero, cliente.Piso && `Piso ${cliente.Piso}`, cliente.Depto && `Dpto ${cliente.Depto}`].filter(Boolean).join(' ')}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Paper>
          )}

          {/* Estado inicial */}
          {!buscado && !loading && !error && (
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 60, height: 60, borderRadius: 4, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PersonSearchIcon sx={{ fontSize: 30, color: '#cbd5e1' }} />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>Ingresá un DNI para comenzar</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#cbd5e1', textAlign: 'center' }}>
                Presioná Enter o hacé clic en Buscar
              </Typography>
            </Box>
          )}

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <Button variant="outlined" onClick={handleClose} sx={{ borderColor: '#e2e8f0', color: '#475569' }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalBuscarCliente

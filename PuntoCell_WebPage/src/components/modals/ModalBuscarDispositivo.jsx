import { useState, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Paper,
  IconButton, MenuItem, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'

const ModalBuscarDispositivo = ({ open, onClose, tipos, marcas, modelos }) => {
  const [busqueda,     setBusqueda]     = useState('')
  const [idTipoFiltro, setIdTipoFiltro] = useState('')
  const [idMarcaFiltro, setIdMarcaFiltro] = useState('')

  const handleClose = () => {
    setBusqueda(''); setIdTipoFiltro(''); setIdMarcaFiltro('')
    onClose()
  }

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (modelos ?? [])
      .filter(m => {
        const matchNombre = !q || m.nombre.toLowerCase().includes(q)
        const matchTipo   = !idTipoFiltro  || m.idTipo  === Number(idTipoFiltro)
        const matchMarca  = !idMarcaFiltro || m.idMarca === Number(idMarcaFiltro)
        return matchNombre && matchTipo && matchMarca
      })
      .map(m => ({
        ...m,
        tipoNombre:  (tipos  ?? []).find(t => t.id === m.idTipo )?.nombre ?? '–',
        marcaNombre: (marcas ?? []).find(ma => ma.id === m.idMarca)?.nombre ?? '–',
      }))
      .slice(0, 80)
  }, [busqueda, idTipoFiltro, idMarcaFiltro, modelos, tipos, marcas])

  const marcasFiltradas = idTipoFiltro
    ? (marcas ?? []).filter(ma =>
        (modelos ?? []).some(m => m.idTipo === Number(idTipoFiltro) && m.idMarca === ma.id)
      )
    : (marcas ?? [])

  const hayFiltros = busqueda.trim() || idTipoFiltro || idMarcaFiltro
  const mostrarTabla = Boolean(hayFiltros)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>

      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #0c4a6e, #0284c7)',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 3,
      }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PhoneAndroidIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Buscar Dispositivo</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>Consultá modelos registrados en el sistema</Typography>
        </Box>
        <IconButton onClick={handleClose}
          sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Filtros */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, p: 2.5 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mb: 2, fontWeight: 500 }}>
              Filtrá por tipo, marca o buscá por nombre de modelo.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <TextField
                label="Nombre del modelo"
                placeholder="Ej: iPhone 15, Galaxy S24…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 0.5 }} /> }}
                sx={{ minWidth: 220, flex: 1 }}
              />
              <TextField select label="Tipo" value={idTipoFiltro}
                onChange={(e) => { setIdTipoFiltro(e.target.value); setIdMarcaFiltro('') }}
                sx={{ minWidth: 160 }}>
                <MenuItem value="">Todos los tipos</MenuItem>
                {(tipos ?? []).map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </TextField>
              <TextField select label="Marca" value={idMarcaFiltro}
                onChange={(e) => setIdMarcaFiltro(e.target.value)}
                disabled={!idTipoFiltro && marcasFiltradas.length === (marcas ?? []).length && !busqueda}
                sx={{ minWidth: 160 }}>
                <MenuItem value="">Todas las marcas</MenuItem>
                {marcasFiltradas.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
              </TextField>
              {hayFiltros && (
                <Button size="small" onClick={() => { setBusqueda(''); setIdTipoFiltro(''); setIdMarcaFiltro('') }}
                  sx={{ color: '#94a3b8', fontWeight: 600, height: 40 }}>
                  Limpiar
                </Button>
              )}
            </Box>
          </Paper>

          {/* Resultados */}
          {!mostrarTabla ? (
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 60, height: 60, borderRadius: 4, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneAndroidIcon sx={{ fontSize: 30, color: '#cbd5e1' }} />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>
                Usá los filtros para buscar modelos
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#cbd5e1', textAlign: 'center' }}>
                Hay {(modelos ?? []).length} modelos registrados en total
              </Typography>
            </Box>
          ) : resultados.length === 0 ? (
            <Paper elevation={0} sx={{ border: '1.5px solid #fde68a', borderRadius: 2.5, p: 3, backgroundColor: '#fffbeb', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
                No se encontraron modelos con esos criterios
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#b45309', mt: 0.5 }}>
                Podés registrar un nuevo modelo desde "Registrar Dispositivo"
              </Typography>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
                  {resultados.length === 80 && <span style={{ color: '#94a3b8' }}> (mostrando primeros 80)</span>}
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Modelo</TableCell>
                    <TableCell sx={{ width: 140 }}>Marca</TableCell>
                    <TableCell sx={{ width: 130 }}>Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultados.map(r => (
                    <TableRow key={r.id} sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { backgroundColor: '#f8fafc' } }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{r.nombre}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>{r.marcaNombre}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={r.tipoNombre} size="small"
                          sx={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <Button variant="outlined" onClick={handleClose}
          sx={{ borderColor: '#e2e8f0', color: '#475569' }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalBuscarDispositivo

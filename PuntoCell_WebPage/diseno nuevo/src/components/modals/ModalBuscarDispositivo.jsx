import { useState, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box,
  IconButton, MenuItem, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import FilterBar, { FilterField } from '../ui/FilterBar'

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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Buscar dispositivo
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            Consultá modelos registrados en el sistema
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          <FilterBar columns="minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)">
            <FilterField label="Nombre del modelo">
              <TextField
                fullWidth placeholder="Ej: iPhone 15, Galaxy S24…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} /> } }}
              />
            </FilterField>
            <FilterField label="Tipo">
              <TextField select fullWidth value={idTipoFiltro}
                onChange={(e) => { setIdTipoFiltro(e.target.value); setIdMarcaFiltro('') }}>
                <MenuItem value="">Todos los tipos</MenuItem>
                {(tipos ?? []).map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </TextField>
            </FilterField>
            <FilterField label="Marca">
              <TextField select fullWidth value={idMarcaFiltro}
                onChange={(e) => setIdMarcaFiltro(e.target.value)}
                disabled={!idTipoFiltro && marcasFiltradas.length === (marcas ?? []).length && !busqueda}>
                <MenuItem value="">Todas las marcas</MenuItem>
                {marcasFiltradas.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
              </TextField>
            </FilterField>
          </FilterBar>

          {hayFiltros && (
            <Button size="small" onClick={() => { setBusqueda(''); setIdTipoFiltro(''); setIdMarcaFiltro('') }}
              sx={{ alignSelf: 'flex-start', color: 'text.disabled' }}>
              Limpiar filtros
            </Button>
          )}

          {!mostrarTabla ? (
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
              <PhoneAndroidIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>
                Usá los filtros para buscar modelos
              </Typography>
              <Typography sx={{ fontSize: '.72rem', color: 'text.disabled' }}>
                Hay {(modelos ?? []).length} modelos registrados en total
              </Typography>
            </Box>
          ) : resultados.length === 0 ? (
            <Box sx={{ borderRadius: '9px', border: 1, borderColor: 'divider', bgcolor: 'pc.surfaceMuted', p: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '.8125rem', color: 'text.primary', fontWeight: 600 }}>
                No se encontraron modelos con esos criterios
              </Typography>
              <Typography sx={{ fontSize: '.72rem', color: 'text.secondary', mt: 0.5 }}>
                Podés registrar un nuevo modelo desde "Registrar Dispositivo"
              </Typography>
            </Box>
          ) : (
            <Box sx={{ borderRadius: '9px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ px: '15px', py: '9px', bgcolor: 'pc.surfaceMuted', borderBottom: 1, borderColor: 'divider' }}>
                <Typography sx={{ fontSize: '.72rem', color: 'text.secondary', fontWeight: 600 }}>
                  {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
                  {resultados.length === 80 && <Box component="span" sx={{ color: 'text.disabled' }}> (mostrando primeros 80)</Box>}
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 320, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 480 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Modelo</TableCell>
                      <TableCell sx={{ width: 140 }}>Marca</TableCell>
                      <TableCell sx={{ width: 130 }}>Tipo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultados.map(r => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{r.nombre}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{r.marcaNombre}</TableCell>
                        <TableCell>
                          <Chip label={r.tipoNombre} size="small" sx={{ bgcolor: 'pc.accentSoft', color: 'primary.main' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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

export default ModalBuscarDispositivo

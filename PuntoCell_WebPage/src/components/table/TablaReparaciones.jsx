import { useState, useEffect } from 'react'
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, Typography,
  Skeleton, Box, Paper, Pagination,
} from '@mui/material'
import EstadoChip from './EstadoChip'

const FILAS_POR_PAGINA = 10

const COLS = [
  { id: 'NumOrden',     label: 'N° Orden',       w: 100 },
  { id: 'FechaEmision', label: 'Emisión',         w: 100 },
  { id: 'FechaEntrega', label: 'Entrega',          w: 100 },
  { id: 'cliente',      label: 'Cliente',          w: 190 },
  { id: 'dispositivo',  label: 'Dispositivo',      w: 220 },
  { id: 'Falla',        label: 'Falla / Detalle',  w: 170 },
  { id: 'Estado',       label: 'Estado',           w: 120 },
  { id: 'empleado',     label: 'Empleado emisor',  w: 160 },
]

const fmt = (f) =>
  f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–'

const sortVal = (row, id) => {
  switch (id) {
    case 'cliente':    return `${row.ApellidoCliente} ${row.NombreCliente}`
    case 'dispositivo':return `${row.TipoDispositivo} ${row.MarcaDispositivo} ${row.ModeloDispositivo}`
    case 'empleado':   return `${row.ApellidoEmpleado} ${row.NombreEmpleado}`
    case 'FechaEmision': case 'FechaEntrega': return row[id] ? new Date(row[id]) : new Date(0)
    default: return row[id]
  }
}

const TablaReparaciones = ({ ordenes, loading, onRowClick, ordenSeleccionada }) => {
  const [sortCol, setSortCol] = useState('NumOrden')
  const [sortDir, setSortDir] = useState('desc')
  const [pagina, setPagina] = useState(1)

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...ordenes].sort((a, b) => {
    const va = sortVal(a, sortCol), vb = sortVal(b, sortCol)
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Si cambian los filtros/búsqueda (y por lo tanto la cantidad de resultados) o el
  // orden, volvemos a la página 1 para no quedar mostrando una página vacía.
  const totalPaginas = Math.max(1, Math.ceil(sorted.length / FILAS_POR_PAGINA))
  useEffect(() => { setPagina(1) }, [ordenes, sortCol, sortDir])

  const paginaSegura = Math.min(pagina, totalPaginas)
  const paginado = sorted.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA)

  return (
    <Box>
      {/* Table header info */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Órdenes de reparación
          </Typography>
          {!loading && (
            <Box sx={{ px: 1.5, py: 0.3, borderRadius: 6, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                {sorted.length} {sorted.length === 1 ? 'resultado' : 'resultados'}
              </Typography>
            </Box>
          )}
        </Box>
        {ordenSeleccionada && (
          <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Clic en la fila para deseleccionar
          </Typography>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{ border: '1.5px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', mb: 4 }}
      >
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLS.map((col) => (
                  <TableCell key={col.id} sx={{ width: col.w, minWidth: col.w }}>
                    <TableSortLabel
                      active={sortCol === col.id}
                      direction={sortCol === col.id ? sortDir : 'asc'}
                      onClick={() => handleSort(col.id)}
                      sx={{
                        color: '#ffffff !important',
                        '& .MuiTableSortLabel-icon': { color: '#94a3b8 !important', opacity: 0.6 },
                        '&.Mui-active .MuiTableSortLabel-icon': { opacity: 1, color: '#ffffff !important' },
                        '&:hover': { color: '#ffffff' },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={i}>
                    {COLS.map((col) => (
                      <TableCell key={col.id}>
                        <Skeleton variant="rounded" height={16} sx={{ borderRadius: 1, opacity: 0.5 - i * 0.05 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS.length} sx={{ textAlign: 'center', py: 8, border: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '2rem' }}>🔍</Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        No se encontraron órdenes
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                        Probá cambiando los filtros
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginado.map((orden) => {
                  const sel = ordenSeleccionada?.NumOrden === orden.NumOrden
                  return (
                    <TableRow
                      key={orden.NumOrden}
                      hover
                      selected={sel}
                      onClick={() => onRowClick(orden)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {/* N° Orden */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {sel && <Box sx={{ width: 3, height: 22, borderRadius: 2, backgroundColor: '#2563eb', flexShrink: 0 }} />}
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.875rem', color: sel ? '#1d4ed8' : '#0f172a' }}>
                            #{orden.NumOrden}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Fechas */}
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{fmt(orden.FechaEmision)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: orden.FechaEntrega ? '#64748b' : '#cbd5e1', fontWeight: 500 }}>
                          {fmt(orden.FechaEntrega)}
                        </Typography>
                      </TableCell>

                      {/* Cliente */}
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {orden.ApellidoCliente}, {orden.NombreCliente}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, mt: 0.25 }}>
                          DNI {orden.DNICliente}
                        </Typography>
                      </TableCell>

                      {/* Dispositivo */}
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {orden.MarcaDispositivo} {orden.ModeloDispositivo}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, mt: 0.25 }}>
                          {orden.TipoDispositivo}
                        </Typography>
                      </TableCell>

                      {/* Falla */}
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>
                          {orden.Falla}
                        </Typography>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <EstadoChip estado={orden.Estado} />
                      </TableCell>

                      {/* Empleado */}
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                          {orden.ApellidoEmpleado}, {orden.NombreEmpleado}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && sorted.length > FILAS_POR_PAGINA && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              count={totalPaginas}
              page={paginaSegura}
              onChange={(_, p) => setPagina(p)}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default TablaReparaciones

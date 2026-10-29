import { useState, useEffect } from 'react'
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel,
  Box, Paper, Skeleton,
} from '@mui/material'
import EstadoChip from './EstadoChip'
import TablePager from '../ui/TablePager'

const FILAS_POR_PAGINA = 10

const COLS = [
  { id: 'NumOrden',     label: 'N° Orden',        w: 90 },
  { id: 'FechaEmision', label: 'Emisión',         w: 100 },
  { id: 'FechaEntrega', label: 'Entrega',         w: 100 },
  { id: 'cliente',      label: 'Cliente',         w: 190 },
  { id: 'dispositivo',  label: 'Dispositivo',     w: 210 },
  { id: 'Falla',        label: 'Falla / Detalle', w: 170 },
  { id: 'Estado',       label: 'Estado',          w: 110 },
  { id: 'empleado',     label: 'Empleado emisor', w: 150 },
]

const fmt = (f) =>
  f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–'

const sortVal = (row, id) => {
  switch (id) {
    case 'cliente':     return `${row.ApellidoCliente} ${row.NombreCliente}`
    case 'dispositivo': return `${row.TipoDispositivo} ${row.MarcaDispositivo} ${row.ModeloDispositivo}`
    case 'empleado':    return `${row.ApellidoEmpleado} ${row.NombreEmpleado}`
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
  const desdeFila = sorted.length ? (paginaSegura - 1) * FILAS_POR_PAGINA + 1 : 0
  const hastaFila = Math.min(paginaSegura * FILAS_POR_PAGINA, sorted.length)
  const paginado = sorted.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA)

  return (
    <Box>
      {ordenSeleccionada && (
        <Box sx={{ fontSize: '.72rem', color: 'text.disabled', px: 0.5, mb: 1 }}>
          Clic en la fila para deseleccionar
        </Box>
      )}

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {COLS.map((col) => (
                  <TableCell key={col.id} sx={{ width: col.w, minWidth: col.w }}>
                    <TableSortLabel
                      active={sortCol === col.id}
                      direction={sortCol === col.id ? sortDir : 'asc'}
                      onClick={() => handleSort(col.id)}
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
                        <Skeleton variant="rounded" height={14} sx={{ borderRadius: 1, opacity: 0.5 - i * 0.05 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS.length} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                    No se encontraron órdenes con estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                paginado.map((orden) => {
                  const sel = ordenSeleccionada?.NumOrden === orden.NumOrden
                  return (
                    <TableRow key={orden.NumOrden} hover selected={sel} onClick={() => onRowClick(orden)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {sel && <Box sx={{ width: 3, height: 22, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />}
                          <Box className="mono" sx={{ fontWeight: 700, color: sel ? 'primary.main' : 'text.primary' }}>
                            #{orden.NumOrden}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell className="mono" sx={{ color: 'text.secondary' }}>{fmt(orden.FechaEmision)}</TableCell>
                      <TableCell className="mono" sx={{ color: orden.FechaEntrega ? 'text.secondary' : 'text.disabled' }}>
                        {fmt(orden.FechaEntrega)}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ fontWeight: 700, lineHeight: 1.25 }}>{[orden.ApellidoCliente, orden.NombreCliente].filter(Boolean).join(', ') || 'Sin cliente'}</Box>
                        <Box className="mono" sx={{ fontSize: '.72rem', color: 'text.disabled', mt: '1px' }}>DNI {orden.DNICliente || 'N/A'}</Box>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ fontWeight: 700, lineHeight: 1.25 }}>{orden.MarcaDispositivo} {orden.ModeloDispositivo}</Box>
                        <Box sx={{ fontSize: '.72rem', color: 'text.disabled', mt: '1px' }}>{orden.TipoDispositivo}</Box>
                      </TableCell>

                      <TableCell sx={{ color: 'text.secondary' }}>{orden.Falla}</TableCell>

                      <TableCell><EstadoChip estado={orden.Estado} /></TableCell>

                      <TableCell sx={{ color: 'text.secondary' }}>{orden.ApellidoEmpleado}, {orden.NombreEmpleado}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && totalPaginas > 1 && (
          <TablePager
            page={paginaSegura}
            pageCount={totalPaginas}
            from={desdeFila}
            to={hastaFila}
            total={sorted.length}
            unidad={sorted.length === 1 ? 'orden' : 'órdenes'}
            onChange={setPagina}
          />
        )}
      </Paper>
    </Box>
  )
}

export default TablaReparaciones

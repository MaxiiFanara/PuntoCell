import { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import { usePaginacion } from '../../../hooks/usePaginacion';
import StatusPill from '../../../components/ui/StatusPill';
import FilterBar, { FilterField } from '../../../components/ui/FilterBar';
import TablePager from '../../../components/ui/TablePager';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tonoEstado = (estadoPago) => (estadoPago === 3 ? 'ok' : estadoPago === 2 ? 'flat' : 'due');

export default function ComprasTable({ compras, onVerDetalle }) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');

  const filtradas = useMemo(() => compras.filter((c) => {
    const okTexto = !busqueda || c.proveedor.toLowerCase().includes(busqueda.toLowerCase()) || String(c.id).includes(busqueda);
    const okEstado =
      estado === 'todos' ||
      (estado === 'pagadas' && c.estadoPago === 3) ||
      (estado === 'adeudadas' && c.saldo > 0);
    return okTexto && okEstado;
  }), [compras, busqueda, estado]);

  const { pagina, setPagina, totalPaginas, itemsPagina, hayPaginacion } = usePaginacion(filtradas);
  const desdeFila = filtradas.length ? (pagina - 1) * 10 + 1 : 0;
  const hastaFila = Math.min(pagina * 10, filtradas.length);

  const chips = [];
  if (busqueda) chips.push({ campo: 'busqueda', texto: busqueda });
  if (estado !== 'todos') chips.push({ campo: 'estado', texto: estado === 'pagadas' ? 'Pagadas' : 'Con saldo' });

  const quitarChip = (campo) => {
    if (campo === 'busqueda') setBusqueda('');
    if (campo === 'estado') setEstado('todos');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>
      <FilterBar
        columns="minmax(220px,1.8fr) minmax(150px,1fr)"
        chips={chips.map((c) => (
          <StatusPill
            key={c.campo}
            tone="flat"
            label={c.texto}
            sx={{ pr: '5px' }}
            meta={
              <IconButton size="small" aria-label={`Quitar filtro ${c.campo}`} onClick={() => quitarChip(c.campo)}
                sx={{ width: 15, height: 15, p: 0, color: 'inherit', opacity: .7, '&:hover': { opacity: 1 } }}>
                <Close sx={{ fontSize: 11 }} />
              </IconButton>
            }
          />
        ))}
        actions={(busqueda || estado !== 'todos') && (
          <Button size="small" onClick={() => { setBusqueda(''); setEstado('todos'); }}>Limpiar</Button>
        )}
      >
        <FilterField label="Proveedor o N° compra">
          <TextField fullWidth placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </FilterField>
        <FilterField label="Estado">
          <Select size="small" fullWidth value={estado} onChange={(e) => setEstado(e.target.value)}>
            <MenuItem value="todos">Todos los estados</MenuItem>
            <MenuItem value="pagadas">Pagadas</MenuItem>
            <MenuItem value="adeudadas">Con saldo</MenuItem>
          </Select>
        </FilterField>
      </FilterBar>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 82 }}>N°</TableCell>
                <TableCell sx={{ width: 120 }}>Fecha</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Total</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Saldo</TableCell>
                <TableCell sx={{ width: 120 }}>Estado</TableCell>
                <TableCell align="right" sx={{ width: 64 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ height: 140, textAlign: 'center', color: 'text.disabled' }}>
                    Sin compras registradas.
                  </TableCell>
                </TableRow>
              ) : itemsPagina.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell className="mono" sx={{ fontWeight: 600 }}>#{c.id}</TableCell>
                  <TableCell className="mono" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{c.fecha}</TableCell>
                  <TableCell sx={{ fontWeight: 600, letterSpacing: '-.01em' }}>{c.proveedor}</TableCell>
                  <TableCell align="right" className="num" sx={{ fontWeight: 600 }}>U$S {fmt(c.total)}</TableCell>
                  <TableCell align="right" className="num" sx={{ fontWeight: 600, color: c.saldo > 0 ? 'error.main' : 'text.disabled' }}>
                    U$S {fmt(c.saldo)}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={tonoEstado(c.estadoPago)} label={c.condicion} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => onVerDetalle(c)}>
                        <Visibility sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {hayPaginacion && (
          <TablePager
            page={pagina}
            pageCount={totalPaginas}
            from={desdeFila}
            to={hastaFila}
            total={filtradas.length}
            unidad={filtradas.length === 1 ? 'compra' : 'compras'}
            onChange={setPagina}
          />
        )}
      </Paper>
    </Box>
  );
}

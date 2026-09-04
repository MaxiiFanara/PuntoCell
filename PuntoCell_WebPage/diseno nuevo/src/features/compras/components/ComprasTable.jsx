import { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';

import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import FilterBar, { FilterField } from '../../../components/ui/FilterBar';

const FILTROS_VACIOS = { buscar: '', estado: 'Todos', desde: '', hasta: '' };

// dd/mm/aaaa -> Date, para poder comparar contra los inputs type="date"
const aFecha = (ddmmaaaa) => {
  const [d, m, a] = (ddmmaaaa || '').split('/');
  return d && m && a ? new Date(`${a}-${m}-${d}`) : null;
};

export default function ComprasTable({ compras, onVerDetalle }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  // El filtrado es en vivo sobre los datos ya cargados. El botón "Filtrar" del
  // código original no hacía nada, así que no se reintrodujo.
  const filtradas = useMemo(() => {
    const termino = filtros.buscar.trim().toLowerCase();
    const desde = filtros.desde ? new Date(filtros.desde) : null;
    const hasta = filtros.hasta ? new Date(filtros.hasta) : null;

    return compras.filter((c) => {
      if (termino && !`${c.proveedor} ${c.factura}`.toLowerCase().includes(termino)) return false;
      if (filtros.estado === 'Pagadas' && c.condicion !== 'Pagada') return false;
      if (filtros.estado === 'Adeudadas' && c.condicion !== 'Adeudada') return false;
      const f = aFecha(c.fecha);
      if (desde && f && f < desde) return false;
      if (hasta && f && f > hasta) return false;
      return true;
    });
  }, [compras, filtros]);

  const chips = [];
  if (filtros.buscar) chips.push({ campo: 'buscar', texto: filtros.buscar });
  if (filtros.estado !== 'Todos') chips.push({ campo: 'estado', texto: filtros.estado });
  if (filtros.desde || filtros.hasta) {
    chips.push({ campo: 'fechas', texto: `${filtros.desde || '…'} — ${filtros.hasta || '…'}` });
  }

  const quitarChip = (campo) => {
    if (campo === 'fechas') return setFiltros({ ...filtros, desde: '', hasta: '' });
    setFiltros({ ...filtros, [campo]: campo === 'estado' ? 'Todos' : '' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>
      <FilterBar
        columns="minmax(180px,1.6fr) minmax(140px,1fr) minmax(230px,1.4fr)"
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
        actions={<Button size="small" onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar</Button>}
      >
        <FilterField label="Proveedor o factura">
          <TextField
            fullWidth placeholder="Buscar…"
            value={filtros.buscar}
            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
          />
        </FilterField>

        <FilterField label="Estado">
          <Select size="small" fullWidth value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <MenuItem value="Todos">Todos</MenuItem>
            <MenuItem value="Pagadas">Pagadas</MenuItem>
            <MenuItem value="Adeudadas">Adeudadas</MenuItem>
          </Select>
        </FilterField>

        <FilterField label="Período">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <TextField type="date" fullWidth aria-label="Desde"
              value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <Box sx={{ color: 'text.disabled' }}>—</Box>
            <TextField type="date" fullWidth aria-label="Hasta"
              value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          </Box>
        </FilterField>
      </FilterBar>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 150 }}>Comprobante</TableCell>
                <TableCell sx={{ width: 120 }}>Fecha</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell align="right" sx={{ width: 150 }}>Total</TableCell>
                <TableCell sx={{ width: 120 }}>Estado</TableCell>
                <TableCell align="right" sx={{ width: 64 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ height: 140, textAlign: 'center', color: 'text.disabled' }}>
                    No hay compras que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              ) : filtradas.map((compra) => (
                <TableRow key={compra.id} hover>
                  <TableCell>
                    <Box sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{compra.factura}</Box>
                    <Box className="mono" sx={{ fontSize: '.65rem', color: 'text.disabled' }}>#{compra.id}</Box>
                  </TableCell>
                  <TableCell className="mono" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {compra.fecha}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, letterSpacing: '-.01em' }}>{compra.proveedor}</TableCell>
                  <TableCell align="right">
                    <Money ars={compra.totalARS} usd={compra.totalUSD} />
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={compra.condicion === 'Pagada' ? 'ok' : 'due'}
                      label={compra.condicion}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => onVerDetalle(compra)}>
                        <Visibility sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

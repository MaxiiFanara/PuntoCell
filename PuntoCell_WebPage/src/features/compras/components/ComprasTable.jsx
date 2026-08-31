import React, { useState, useMemo } from 'react';
import { Card, Box, TextField, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell, Chip } from '@mui/material';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const chipSx = (estadoPago) => {
  if (estadoPago === 3) return { bgcolor: '#e2f4ed', color: '#0e7a56' };
  if (estadoPago === 2) return { bgcolor: '#e9f0fe', color: '#2456d6' };
  return { bgcolor: '#fdf1de', color: '#9c5f07' };
};

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

  return (
    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
      <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #eef2f8', bgcolor: '#f8fafd', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Buscar proveedor o #compra…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} sx={{ bgcolor: 'white', minWidth: 260 }} />
        <TextField select size="small" value={estado} onChange={(e) => setEstado(e.target.value)} sx={{ bgcolor: 'white', minWidth: 170 }}>
          <MenuItem value="todos">Todos los estados</MenuItem>
          <MenuItem value="pagadas">Pagadas</MenuItem>
          <MenuItem value="adeudadas">Con saldo</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={() => { setBusqueda(''); setEstado('todos'); }}
          sx={{ borderColor: '#e2e8f2', color: '#52607a', textTransform: 'none' }}>
          Limpiar
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafd' }}>
            <TableRow>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>#</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>Proveedor</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Total</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Saldo</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Estado</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#8695ad' }}>Sin compras registradas.</TableCell></TableRow>
            ) : filtradas.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>#{c.id}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{c.fecha}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{c.proveedor}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>U$S {fmt(c.total)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', color: c.saldo > 0 ? '#c0392f' : '#8695ad' }}>U$S {fmt(c.saldo)}</TableCell>
                <TableCell align="center">
                  <Chip label={c.condicion} size="small" sx={{ ...chipSx(c.estadoPago), fontWeight: 700, borderRadius: '4px' }} />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => onVerDetalle(c)} sx={{ textTransform: 'none', color: '#52607a' }}>Ver Detalle</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}

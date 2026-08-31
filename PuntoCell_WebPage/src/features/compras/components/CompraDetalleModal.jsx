import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { comprasService, ESTADO_PAGO } from '../../../services/comprasServices';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CompraDetalleModal({ open, onClose, compraId }) {
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!compraId) return;
    setCargando(true);
    comprasService.getCompra(compraId)
      .then(setCompra)
      .catch((e) => alert('No se pudo cargar el detalle: ' + (e.message || '')))
      .finally(() => setCargando(false));
  }, [compraId]);

  const detalles = compra?.detalles || compra?.Detalles || [];
  const estado = compra ? (ESTADO_PAGO[compra.EstadoPago] || '—') : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">
          Compra <span style={{ fontFamily: 'monospace', color: '#8695ad', marginLeft: 8 }}>#{compraId}</span>
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {cargando ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !compra ? (
          <Typography color="error">No se encontró la compra.</Typography>
        ) : (
          <>
            <Box sx={{ bgcolor: '#f8fafd', p: 2, borderRadius: 2, border: '1px solid #e2e8f2', display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">Proveedor</Typography>
                <Typography fontWeight="bold">{compra.proveedor?.Nombre || `#${compra.IdProveedor}`}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">Fecha</Typography>
                <Typography fontFamily="monospace">{compra.Fecha ? String(compra.Fecha).slice(0, 10) : '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">Estado</Typography>
                <Box mt={0.5}>
                  <Chip size="small" label={estado} sx={{
                    fontWeight: 'bold',
                    bgcolor: compra.EstadoPago === 3 ? '#e2f4ed' : compra.EstadoPago === 2 ? '#e9f0fe' : '#fdf1de',
                    color: compra.EstadoPago === 3 ? '#0e7a56' : compra.EstadoPago === 2 ? '#2456d6' : '#9c5f07',
                  }} />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">Saldo pendiente</Typography>
                <Typography fontFamily="monospace" color={Number(compra.SaldoPendiente) > 0 ? '#c0392f' : '#0e7a56'}>
                  U$S {fmt(compra.SaldoPendiente)}
                </Typography>
              </Box>
            </Box>

            <Typography variant="overline" fontWeight="bold" color="textSecondary">RENGLONES</Typography>
            <Box sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafd' }}>
                  <TableRow>
                    <TableCell>Inventario</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Costo Unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalles.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#8695ad' }}>Sin renglones.</TableCell></TableRow>
                  ) : detalles.map((d, i) => (
                    <TableRow key={d.Id ?? i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>#{d.IdArticulo ?? d.IdInventario}</TableCell>
                      <TableCell align="center">{d.Cantidad}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>U$S {fmt(d.PrecioCostoUnitario)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        U$S {fmt(Number(d.Cantidad) * Number(d.PrecioCostoUnitario))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box textAlign="right" mt={3}>
              <Typography variant="h5" color="primary" fontWeight="bold" fontFamily="monospace">U$S {fmt(compra.TotalCosto)}</Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

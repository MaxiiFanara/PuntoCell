import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { comprasService, ESTADO_PAGO } from '../../../services/comprasServices';
import StatusPill from '../../../components/ui/StatusPill';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tonoEstado = (ep) => (ep === 3 ? 'ok' : ep === 2 ? 'flat' : 'due');

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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          Compra <Box component="span" className="mono" sx={{ color: 'text.disabled', ml: 1 }}>#{compraId}</Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>

      <DialogContent>
        {cargando ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !compra ? (
          <Typography color="error.main">No se encontró la compra.</Typography>
        ) : (
          <>
            <Box sx={{
              display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' },
              gap: 0, border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden', mb: 2,
            }}>
              {[
                { label: 'Proveedor', node: <Typography sx={{ fontWeight: 600, fontSize: '.84rem' }}>{compra.proveedor?.Nombre || `#${compra.IdProveedor}`}</Typography> },
                { label: 'Fecha', node: <Typography className="mono" sx={{ fontWeight: 600, fontSize: '.84rem' }}>{compra.Fecha ? String(compra.Fecha).slice(0, 10) : '—'}</Typography> },
                { label: 'Estado', node: <StatusPill tone={tonoEstado(compra.EstadoPago)} label={estado} /> },
                { label: 'Saldo pendiente', node: <Typography className="mono" sx={{ fontWeight: 600, fontSize: '.84rem', color: Number(compra.SaldoPendiente) > 0 ? 'error.main' : 'success.main' }}>U$S {fmt(compra.SaldoPendiente)}</Typography> },
              ].map((m, i) => (
                <Box key={m.label} sx={{ p: '12px 14px', borderLeft: { sm: i === 0 ? 0 : 1 }, borderTop: { xs: i > 1 ? 1 : 0, sm: 0 }, borderColor: 'pc.dividerSoft' }}>
                  <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: '4px' }}>{m.label}</Box>
                  {m.node}
                </Box>
              ))}
            </Box>

            <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Renglones</Box>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Inventario</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Costo unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalles.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.disabled' }}>Sin renglones.</TableCell></TableRow>
                  ) : detalles.map((d, i) => (
                    <TableRow key={d.Id ?? i}>
                      <TableCell className="mono">#{d.IdArticulo ?? d.IdInventario}</TableCell>
                      <TableCell align="center" className="num">{d.Cantidad}</TableCell>
                      <TableCell align="right" className="num">U$S {fmt(d.PrecioCostoUnitario)}</TableCell>
                      <TableCell align="right" className="num" sx={{ fontWeight: 700 }}>
                        U$S {fmt(Number(d.Cantidad) * Number(d.PrecioCostoUnitario))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ textAlign: 'right', mt: 2.5 }}>
              <Typography className="num" sx={{ fontSize: '1.44rem', fontWeight: 600, letterSpacing: '-.035em', color: 'primary.main' }}>
                U$S {fmt(compra.TotalCosto)}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

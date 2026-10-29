import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { comprasService, ESTADO_PAGO } from '../../../services/comprasServices';
import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import { useVenta } from '../../punto-venta/context/VentaContext';
import { toast } from 'sonner';

const tonoEstado = (ep) => (ep === 3 ? 'ok' : ep === 2 ? 'flat' : 'due');

export default function CompraDetalleModal({ open, onClose, compraId }) {
  // Los montos de la compra son USD (fuente de verdad); dolarGlobal solo se usa para
  // mostrar el equivalente en pesos.
  const { dolarGlobal } = useVenta();
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!compraId) return;
    setCargando(true);
    comprasService.getCompra(compraId)
      .then(setCompra)
      .catch((e) => toast.error('No se pudo cargar el detalle: ' + (e.message || '')))
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
                { label: 'Proveedor', node: <Typography sx={{ fontWeight: 600, fontSize: '.84rem' }}>{compra.proveedor?.Nombre || '—'}</Typography> },
                { label: 'Fecha', node: <Typography className="mono" sx={{ fontWeight: 600, fontSize: '.84rem' }}>{compra.Fecha ? String(compra.Fecha).slice(0, 10) : '—'}</Typography> },
                { label: 'Estado', node: <StatusPill tone={tonoEstado(compra.EstadoPago)} label={estado} /> },
                { label: 'Saldo pendiente', node: <Money ars={Number(compra.SaldoPendiente) * dolarGlobal} usd={compra.SaldoPendiente} align="left" size="sm" /> },
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
                    <TableCell>Producto</TableCell>
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
                      <TableCell sx={{ fontWeight: 600 }}>{d.inventario?.articulo?.Nombre || '—'}</TableCell>
                      <TableCell align="center" className="num">{d.Cantidad}</TableCell>
                      <TableCell align="right"><Money ars={d.PrecioCostoUnitario * dolarGlobal} usd={d.PrecioCostoUnitario} size="sm" /></TableCell>
                      <TableCell align="right">
                        <Money ars={Number(d.Cantidad) * Number(d.PrecioCostoUnitario) * dolarGlobal} usd={Number(d.Cantidad) * Number(d.PrecioCostoUnitario)} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ textAlign: 'right', mt: 2.5 }}>
              <Money ars={Number(compra.TotalCosto) * dolarGlobal} usd={compra.TotalCosto} size="lg" />
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

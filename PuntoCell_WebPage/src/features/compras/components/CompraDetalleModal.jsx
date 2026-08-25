import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const formatoMoneda = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CompraDetalleModal({ open, onClose, compra }) {
  if (!compra) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">Detalle de Factura <span style={{ fontFamily: 'monospace', color: '#8695ad', marginLeft: 8 }}>#{compra.factura}</span></Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {/* Cabecera Info */}
        <Box sx={{ bgcolor: '#f8fafd', p: 2, borderRadius: 2, border: '1px solid #e2e8f2', display: 'flex', gap: 4, mb: 3 }}>
          <Box>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">Proveedor</Typography>
            <Typography fontWeight="bold">{compra.proveedor}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">Fecha</Typography>
            <Typography fontFamily="monospace">{compra.fecha}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">Estado</Typography>
            <Box mt={0.5}>
              <Chip size="small" label={compra.condicion} sx={{ fontWeight: 'bold', bgcolor: compra.condicion === 'Pagada' ? '#e2f4ed' : '#fdf1de', color: compra.condicion === 'Pagada' ? '#0e7a56' : '#9c5f07' }}/>
            </Box>
          </Box>
        </Box>

        {/* Productos */}
        <Typography variant="overline" fontWeight="bold" color="textSecondary">PRODUCTOS ADQUIRIDOS</Typography>
        <Box sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafd' }}>
              <TableRow>
                <TableCell>Modelo</TableCell>
                <TableCell>Specs</TableCell>
                <TableCell align="center">Cant.</TableCell>
                <TableCell align="right">Costo (USD)</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compra.items && compra.items.length > 0 ? compra.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Typography fontWeight="bold">{item.modelo}</Typography>
                    {item.esSerial && <Typography variant="caption" color="textSecondary" fontFamily="monospace">IMEI: {item.imei}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {[item.color, item.memoria, item.estado].filter(Boolean).map((spec, j) => (
                        <Chip key={j} label={spec} size="small" sx={{ fontSize: 10, height: 20 }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{item.cant}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>U$S {formatoMoneda(item.costo)}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>U$S {formatoMoneda(item.cant * item.costo)}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#8695ad' }}>No hay detalles cargados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Box textAlign="right" mt={3}>
          <Typography variant="body2" color="textSecondary">Total en Pesos: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0f1729' }}>ARS $ {formatoMoneda(compra.totalARS)}</span></Typography>
          <Typography variant="h5" color="primary" fontWeight="bold" fontFamily="monospace">U$S {formatoMoneda(compra.totalUSD)}</Typography>
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cerrar Detalle</Button>
      </DialogActions>
    </Dialog>
  );
}
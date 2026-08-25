import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const formatoMoneda = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CuentasPorPagarModal({ open, onClose, compras, onSaldar }) {
  const deudas = compras.filter(c => c.condicion === 'Adeudada');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">Gestión de Cuentas por Pagar</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {deudas.length === 0 ? (
          <Typography textAlign="center" color="#0e7a56" fontWeight="bold">¡Excelente! No tienes cuentas por pagar registradas.</Typography>
        ) : (
          deudas.map(deuda => (
            <Box key={deuda.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, mb: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f2' }}>
              <Box>
                <Typography fontWeight="bold" fontSize={14}>{deuda.proveedor}</Typography>
                <Typography variant="caption" color="textSecondary" fontFamily="monospace">Factura: {deuda.factura} | Fecha: {deuda.fecha}</Typography>
              </Box>
              <Box textAlign="right" mr={2}>
                <Typography fontWeight="bold" color="#c0392f" fontFamily="monospace">ARS $ {formatoMoneda(deuda.totalARS)}</Typography>
                <Typography variant="caption" color="textSecondary" fontFamily="monospace">U$S {formatoMoneda(deuda.totalUSD)}</Typography>
              </Box>
              <Button variant="contained" size="small" color="success" sx={{ textTransform: 'none' }} onClick={() => onSaldar(deuda.id)}>Saldar</Button>
            </Box>
          ))
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
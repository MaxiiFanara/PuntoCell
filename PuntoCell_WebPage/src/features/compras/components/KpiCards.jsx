import React from 'react';
import { Box, Card, Typography, Grid } from '@mui/material';

const formatoMoneda = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KpiCards({ compras }) {
  const totalARS = compras.reduce((acc, c) => acc + c.totalARS, 0);
  const totalUSD = compras.reduce((acc, c) => acc + c.totalUSD, 0);
  
  const adeudadas = compras.filter(c => c.condicion === 'Adeudada');
  const deudaARS = adeudadas.reduce((acc, c) => acc + c.totalARS, 0);

  return (
    <Grid container spacing={2} mb={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #2456d6', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Total Comprado (Mes)</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: 'monospace', mt: 1 }}>$ {formatoMoneda(totalARS)}</Typography>
          <Typography variant="caption" color="textSecondary">U$S {formatoMoneda(totalUSD)}</Typography>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #9c5f07', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Cuentas por Pagar</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: 'monospace', mt: 1, color: '#9c5f07' }}>$ {formatoMoneda(deudaARS)}</Typography>
          <Typography variant="caption" color="textSecondary">{adeudadas.length} facturas pendientes</Typography>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #8695ad', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Operaciones</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>{compras.length}</Typography>
          <Typography variant="caption" color="textSecondary">Facturas registradas</Typography>
        </Card>
      </Grid>
    </Grid>
  );
}
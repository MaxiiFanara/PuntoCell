import React from 'react';
import { Card, Typography, Grid } from '@mui/material';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KpiCards({ compras }) {
  const totalComprado = compras.reduce((acc, c) => acc + c.total, 0);
  const adeudadas = compras.filter((c) => c.saldo > 0);
  const deuda = adeudadas.reduce((acc, c) => acc + c.saldo, 0);

  return (
    <Grid container spacing={2} mb={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #2456d6', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Total Comprado</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: 'monospace', mt: 1 }}>U$S {fmt(totalComprado)}</Typography>
          <Typography variant="caption" color="textSecondary">{compras.length} facturas registradas</Typography>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #9c5f07', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Cuentas por Pagar</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: 'monospace', mt: 1, color: '#9c5f07' }}>U$S {fmt(deuda)}</Typography>
          <Typography variant="caption" color="textSecondary">{adeudadas.length} facturas con saldo</Typography>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #0e7a56', boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
          <Typography variant="overline" color="textSecondary" fontWeight="bold">Pagadas</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, color: '#0e7a56' }}>
            {compras.filter((c) => c.estadoPago === 3).length}
          </Typography>
          <Typography variant="caption" color="textSecondary">de {compras.length} operaciones</Typography>
        </Card>
      </Grid>
    </Grid>
  );
}

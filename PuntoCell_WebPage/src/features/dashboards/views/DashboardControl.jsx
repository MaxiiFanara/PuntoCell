import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Tooltip, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyControlDashboard, loadControlDashboard } from '../data/dashboardData';

// ==========================================
// 2. COMPONENTES WRAPPER & HEATMAP CUSTOM
// ==========================================
const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, height: '100%', width: '100%' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</Box>
    </Box>
  </Paper>
);

// Componente Heatmap Nativo en MUI
const MatrizAuditoria = ({ data }) => {
  const columnas = ['Ventas', 'Compras', 'Anulaciones', 'Descuentos'];
  
  // Encontramos los valores máximos para calcular la opacidad (0.1 a 1)
  const maximos = {
    Ventas: Math.max(...data.map(d => d.Ventas)),
    Compras: Math.max(...data.map(d => d.Compras)),
    Anulaciones: Math.max(...data.map(d => d.Anulaciones)),
    Descuentos: Math.max(...data.map(d => d.Descuentos)),
  };

  const getCellColor = (columna, valor) => {
    if (valor === 0) return 'transparent';
    const intensidad = Math.max(0.15, valor / maximos[columna]); // Opacidad mínima 15%
    // Verde para operaciones normales, Rojo/Naranja para riesgo
    if (columna === 'Anulaciones') return `rgba(169, 59, 50, ${intensidad})`; // error.main
    if (columna === 'Descuentos') return `rgba(223, 167, 88, ${intensidad})`; // warning.main
    return `rgba(28, 163, 116, ${intensidad})`; // primary (verde)
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflowY: 'auto', pr: 1 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 1, mb: 1 }}>
        <Box />
        {columnas.map(col => (
          <Typography key={col} sx={{ fontSize: '.75rem', fontWeight: 600, textAlign: 'center', color: 'text.secondary' }}>
            {col}
          </Typography>
        ))}
      </Box>
      {/* Filas */}
      {data.map((row, i) => (
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.empleado}
          </Typography>
          {columnas.map(col => (
            <Tooltip key={col} title={`${row.empleado}: ${row[col]} ${col}`} arrow placement="top">
              <Box 
                sx={{ 
                  height: 38, 
                  borderRadius: 1.5, 
                  bgcolor: getCellColor(col, row[col]),
                  border: '1px solid',
                  borderColor: row[col] === 0 ? 'divider' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.05)', cursor: 'pointer', borderColor: 'text.primary' }
                }}
              >
                <Typography sx={{ fontSize: '.75rem', fontWeight: 700, color: row[col] > (maximos[col]*0.5) ? '#fff' : 'text.primary' }}>
                  {row[col]}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default function DashboardControl() {
  const [dashboard, setDashboard] = useState(emptyControlDashboard);

  useEffect(() => {
    let mounted = true;
    loadControlDashboard()
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const { kpis, heatmap, evolucionRiesgo } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Control y Auditoría" meta="Matriz de operaciones y detección de anomalías." />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Operaciones Totales" value={String(kpis.operacionesTotales)} sub="Registradas en sistema" tone="mute" />
          <KpiCard eyebrow="Anulaciones" value={String(kpis.anulaciones)} sub="4.1% del total" tone="error" />
          <KpiCard eyebrow="Descuentos Aplicados" value={String(kpis.descuentosAplicados)} sub="U$S 1,250 cedidos" tone="warn" />
          <KpiCard eyebrow="Usuarios Activos" value={String(kpis.usuariosActivos)} sub="Operando en el período" tone="info" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Matriz Empleado x Operación (Heatmap)" height={320}>
            <MatrizAuditoria data={heatmap} />
          </DashboardCard>
          
          <DashboardCard title="Evolución de Operaciones de Riesgo" height={320}>
            <LineChart
              xAxis={[{ scaleType: 'point', data: evolucionRiesgo.xAxis }]}
              series={evolucionRiesgo.series.map(s => ({ data: s.data, label: s.label, color: s.color, showMark: true }))}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>
      </Box>
    </Box>
  );
}
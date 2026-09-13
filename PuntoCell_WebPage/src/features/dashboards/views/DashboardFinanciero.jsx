import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart, ChartsGrid } from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyFinancieroDashboard, loadFinancieroDashboard } from '../data/dashboardData';

// ==========================================
// 2. COMPONENTE WRAPPER
// ==========================================
const DashboardCard = ({ title, children, height = 350 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, height: '100%', width: '100%' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</Box>
    </Box>
  </Paper>
);

// ==========================================
// 3. VISTA PRINCIPAL
// ==========================================
export default function DashboardFinanciero() {
  const [dashboard, setDashboard] = useState(emptyFinancieroDashboard);

  useEffect(() => {
    let mounted = true;
    loadFinancieroDashboard()
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const { kpis, ingresosEgresos, margenProducto, margenCategoria, rentabilidadMarca } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo Financiero / Caja" meta="Flujo de caja, ingresos, egresos y análisis de márgenes." />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Ingresos Totales" value={`U$S ${kpis.ingresosTotales.toLocaleString('es-AR')}`} sub="Acumulado" tone="ok" />
          <KpiCard eyebrow="Egresos Totales" value={`U$S ${kpis.egresosTotales.toLocaleString('es-AR')}`} sub="Acumulado" tone="error" />
          <KpiCard eyebrow="Flujo Neto" value={`U$S ${kpis.flujoNeto.toLocaleString('es-AR')}`} sub="Caja disponible" tone="info" />
          <KpiCard eyebrow="Margen Promedio" value={`${kpis.margenPromedio}%`} sub="Global" tone="accent" />
        </Box>

        {/* FILA 2: Ingresos vs Egresos (1) y Margen por Categoría (6.5) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Flujo de Caja: Ingresos vs Egresos (Miles $)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: ingresosEgresos.meses }]}
              series={[
                { data: ingresosEgresos.ingresos, label: 'Ingresos', color: '#12684e' },
                { data: ingresosEgresos.egresos, label: 'Egresos', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            >
              <ChartsGrid horizontal />
            </BarChart>
          </DashboardCard>

          <DashboardCard title="Margen por Categoría (Apilado)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: margenCategoria.map(c => c.categoria) }]}
              series={[
                { data: margenCategoria.map(c => c.costo), label: 'Costo', color: '#a39d93', stack: 'total' },
                { data: margenCategoria.map(c => c.margenNeto), label: 'Margen Neto', color: '#12684e', stack: 'total' }
              ]}
              margin={{ top: 20, bottom: 25, left: 50, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Margen por Producto (6.4) y Rentabilidad por Marca (6.6) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          
          <DashboardCard title="Margen vs Volumen por Producto (%)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: margenProducto.map(p => p.nombre) }]}
              series={[
                { data: margenProducto.map(p => p.ventas), label: 'Volumen Venta ($)', color: '#dfa758' },
                { data: margenProducto.map(p => p.margen), label: 'Margen (%)', color: '#4cbf93' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>

          <DashboardCard title="Ranking de Rentabilidad por Marca (U$S)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: rentabilidadMarca.map(m => m.marca) }]}
              series={[{ data: rentabilidadMarca.map(m => m.rentabilidad), color: '#12684e' }]}
              margin={{ top: 10, bottom: 25, left: 90, right: 20 }}
            />
          </DashboardCard>

        </Box>

      </Box>
    </Box>
  );
}
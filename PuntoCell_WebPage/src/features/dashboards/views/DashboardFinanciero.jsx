import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart, ChartsGrid } from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyFinancieroDashboard, loadFinancieroDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

const DashboardCard = ({ title, children, height = 350 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, height: '100%', width: '100%' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</Box>
    </Box>
  </Paper>
);

export default function DashboardFinanciero() {
  const [dashboard, setDashboard] = useState(emptyFinancieroDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(180);

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error("Error al cargar sucursales:", err));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadFinancieroDashboard(seeAll ? null : range, branchId)
      .then((data) => { if (mounted) setDashboard(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll, branchId]);

  const { kpis, ingresosEgresos, margenProducto, margenCategoria, rentabilidadMarca } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo Financiero / Caja" meta="Flujo de caja, ingresos, egresos y análisis de márgenes." />
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Ingresos Totales" value={`U$S ${kpis.ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Acumulado" tone="ok" />
          <KpiCard eyebrow="Egresos Totales" value={`U$S ${kpis.egresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Acumulado" tone="error" />
          <KpiCard eyebrow="Flujo Neto" value={`U$S ${kpis.flujoNeto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Caja disponible" tone="info" />
          <KpiCard eyebrow="Margen Promedio" value={`${kpis.margenPromedio}%`} sub="Global" tone="accent" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ventas Vs. Compras">
            <BarChart
              xAxis={[{ scaleType: 'band', data: ingresosEgresos.meses, label: 'Meses' }]}
              yAxis={[{ label: 'Monto ($)' }]}
              series={[
                { data: ingresosEgresos.ingresos, label: 'Ingresos', color: '#12684e' },
                { data: ingresosEgresos.egresos, label: 'Egresos', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 20, left: 30, right: 20 }}
            >
              <ChartsGrid horizontal />
            </BarChart>
          </DashboardCard>

          <DashboardCard title="Margen por Categoría (Apilado)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: margenCategoria.map(c => c.categoria), label: 'Categorías' , width: 'auto', tickLabelStyle: { fontSize: 11 }}]}
              yAxis={[{ label: 'Monto ($)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: margenCategoria.map(c => c.costo), label: 'Costo', color: '#a39d93', stack: 'total' },
                { data: margenCategoria.map(c => c.margenNeto), label: 'Margen Neto', color: '#12684e', stack: 'total' }
              ]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          
          <DashboardCard title="Volumen por Producto (%)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: margenProducto.map(p => p.nombre), label: 'Productos' , width: 'auto', tickLabelStyle: { fontSize: 11 }, colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']} }]}
              yAxis={[{ label: 'Métricas (%, $)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: margenProducto.map(p => p.ventas) },
                //{ data: margenProducto.map(p => p.margen), label: 'Margen (%)', color: '#4cbf93' }
              ]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>

          <DashboardCard title="Ranking de Rentabilidad por Marca (U$S)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: rentabilidadMarca.map(m => m.marca), label: 'Marcas', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              xAxis={[{ label: 'Rentabilidad ($)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: rentabilidadMarca.map(m => m.rentabilidad), color: '#12684e' }]}
              margin={{ top: 10, bottom: 20, left: 20, right: 20 }}
            />
          </DashboardCard>

        </Box>

      </Box>
    </Box>
  );
}
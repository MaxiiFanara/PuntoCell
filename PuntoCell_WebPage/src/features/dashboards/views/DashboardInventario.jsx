import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  BarChart, 
  PieChart, 
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyInventarioDashboard, loadInventarioDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO
// ==========================================
const DashboardCard = ({ title, children, height = 360 }) => (
  <Paper 
    sx={{ 
      p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column',
      borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, 
      height: '100%', width: '100%'
    }}
  >
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
      {title}
    </Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

// ==========================================
// 3. VISTA PRINCIPAL
// ==========================================
export default function DashboardInventario() {
  const [dashboard, setDashboard] = useState(emptyInventarioDashboard);
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    let mounted = true;
    loadInventarioDashboard(seeAll ? null : range)
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll]);

  const { kpis, aging, valorizacion } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Inventario" 
        meta="Análisis de antigüedad (Aging) y rotación de productos." 
      />

      <DashboardRangeFilter
        range={range}
        seeAll={seeAll}
        onChangeFrom={updateFrom}
        onChangeTo={updateTo}
        onToggleSeeAll={toggleSeeAll}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Artículos" value={String(kpis.totalArticulos)} sub="Unidades físicas" tone="mute" />
          <KpiCard eyebrow="Capital Inmovilizado" value={`U$S ${kpis.capitalInmovilizado.toLocaleString('es-AR')}`} sub="Valorización a costo" tone="info" />
          <KpiCard eyebrow="Riesgo de Obsolescencia" value={String(kpis.riesgoObsolescencia)} sub="Productos con +90 días" tone="error" />
          <KpiCard eyebrow="Índice de Rotación" value={String(kpis.indiceRotacion)} sub="Veces por año" tone="ok" />
        </Box>

        {/* FILA 2: Aging Analysis (Cantidades físicas vs Valorización Financiera) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          
          <DashboardCard title="Productos sin movimiento (Cantidades)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: aging.categorias, label: 'Días sin registrar ventas' }]}
              series={[
                { 
                  data: aging.cantidades, 
                  label: 'Cantidad de Productos', 
                  // Usamos una función para pintar las barras de rojo a medida que son más viejas
                  color: '#12684e' 
                }
              ]}
              margin={{ top: 20, bottom: 50, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Valorización del Stock Estancado (U$S)">
            <PieChart
              series={[{
                data: valorizacion,
                innerRadius: '45%',
                outerRadius: '85%',
                paddingAngle: 2,
                cornerRadius: 4,
              }]}
              margin={{ top: 10, bottom: 70, left: 10, right: 10 }}
              slotProps={{
                legend: {
                  direction: 'row',
                  position: { vertical: 'bottom', horizontal: 'middle' },
                },
              }}
            />
          </DashboardCard>

        </Box>

      </Box>
    </Box>
  );
}
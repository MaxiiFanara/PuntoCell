import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  ScatterChart,
  ChartsContainer,
  BarPlot,
  LinePlot,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip,
  ChartsGrid
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyReparacionesDashboard, loadReparacionesDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO
// ==========================================
const DashboardCard = ({ title, children, height = 340 }) => (
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
export default function DashboardReparaciones() {
  const [dashboard, setDashboard] = useState(emptyReparacionesDashboard);
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    let mounted = true;
    loadReparacionesDashboard(seeAll ? null : range)
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll]);

  const { kpis, periodo, dispositivos, marcas, dispositivoFalla, pareto, distribucionTiempo, tecnicos, matriz } = dashboard;
  const periodoData = periodo.series?.[0]?.data ?? [];
  const periodoXAxis = periodo.xAxis?.length > 0
    ? periodo.xAxis
    : periodoData.map((_, index) => index + 1);
  const periodoSeries = periodoXAxis.length === periodoData.length
    ? periodoData
    : periodoXAxis.map((_, index) => periodoData[index] ?? 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Reparaciones" 
        meta="Análisis de fallas, tiempos técnicos y rentabilidad del servicio." 
      />

      <DashboardRangeFilter
        range={range}
        seeAll={seeAll}
        onChangeFrom={updateFrom}
        onChangeTo={updateTo}
        onToggleSeeAll={toggleSeeAll}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs (Incluye KPI 6: Tiempo Promedio) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Reparaciones Totales" value={String(kpis.reparacionesTotales)} sub="Equipos procesados" tone="ok" />
          <KpiCard eyebrow="Tiempo Promedio (MRT)" value={`${kpis.tiempoPromedio} Días`} sub="Desde ingreso a retiro" tone="accent" />
          <KpiCard eyebrow="Tasa de Éxito" value={`${kpis.tasaExito}%`} sub="Sin devoluciones por garantía" tone="info" />
          <KpiCard eyebrow="Margen Global" value={`${kpis.margenGlobal}%`} sub="Rentabilidad operativa" tone="warn" />
        </Box>

        {/* FILA 2: Evolución (1) y Distribución del Tiempo (7) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Período">
            <LineChart
              xAxis={[{ scaleType: 'point', data: periodoXAxis, valueFormatter: (v) => String(v) }]}
              series={[{ 
                data: periodoSeries,
                area: true, color: '#12684e', showMark: true, curve: 'linear', label: 'Ingresos Técnicos'
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Distribución de Tiempos (Histograma)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: distribucionTiempo.categorias }]}
              series={[{ data: distribucionTiempo.frecuencia, color: '#a39d93', label: 'Cant. Reparaciones' }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Dispositivos (2) y Marcas (3) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Dispositivo">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: dispositivos.map(d => d.label) }]}
              series={[{ data: dispositivos.map(d => d.value), color: '#12684e' }]}
              margin={{ top: 10, bottom: 25, left: 90, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Reparaciones por Marca">
            <BarChart
              xAxis={[{ scaleType: 'band', data: marcas.map(m => m.label) }]}
              series={[{ data: marcas.map(m => m.value), color: '#4cbf93' }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Pareto de Fallas (5) y Dispositivo x Reparacion (4) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Pareto de Fallas">
            <ChartsContainer
              series={[
                { type: 'bar', data: pareto.absolutas, yAxisKey: 'leftAxis', color: '#12684e', label: 'Cant. Fallas' },
                { type: 'line', data: pareto.acumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acumulado' }
              ]}
              xAxis={[{ data: pareto.fallas, scaleType: 'band', id: 'x-axis' }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear' },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105 }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 40 }}
            >
              <ChartsGrid horizontal />
              <BarPlot />
              <LinePlot />
              <ChartsXAxis axisId="x-axis" />
              <ChartsYAxis axisId="leftAxis" position="left" />
              <ChartsYAxis axisId="rightAxis" position="right" />
              <ChartsTooltip />
            </ChartsContainer>
          </DashboardCard>

          <DashboardCard title="Cruce: Dispositivo vs Tipo de Reparación">
              <BarChart
              xAxis={[{ scaleType: 'band', data: dispositivoFalla.map(d => d.dispositivo ?? d.tipo ?? 'Sin tipo') }]}
              series={[
                { data: dispositivoFalla.map(d => d.pantalla), label: 'Pantalla', color: '#12684e', stack: 'total' },
                { data: dispositivoFalla.map(d => d.bateria), label: 'Batería', color: '#4cbf93', stack: 'total' },
                { data: dispositivoFalla.map(d => d.pinCarga), label: 'Pin Carga', color: '#dfa758', stack: 'total' },
                { data: dispositivoFalla.map(d => d.software), label: 'Software', color: '#a39d93', stack: 'total' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Rentabilidad / Performance (8) y Matriz Quadrante (9) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Performance Técnico (Éxito vs Devolución)" height={400}>
             <BarChart
                xAxis={[{ scaleType: 'band', data: tecnicos.map(t => t.nombre) }]}
                series={[
                  { data: tecnicos.map(t => t.exitosas), label: 'Terminadas OK', color: '#12684e' },
                  { data: tecnicos.map(t => t.devueltas), label: 'Devueltas/Garantía', color: '#a93b32' }
                ]}
                margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
              />
          </DashboardCard>
          
          <DashboardCard title="Matriz: Demanda vs Rentabilidad" height={400}>
            <ScatterChart
                xAxis={[{ label: '← Baja Demanda | Cantidad de Reparaciones | Alta Demanda →', min: 0 }]}
                yAxis={[{ label: 'Margen de Rentabilidad (%)', min: 0 }]}
                series={matriz.map((item) => ({
                  type: 'scatter',
                  id: item.id,
                  label: item.servicio,
                  color: item.color,
                  // El eje Z mapea el tamaño de la burbuja (facturación)
                  data: [{ x: item.x, y: item.y, z: item.z, id: item.id }], 
                }))}
                margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
                // Personalizamos el tamaño de las burbujas
                zAxis={[{ data: matriz.map(m => m.z), min: 0, max: 20000 }]} 
              />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
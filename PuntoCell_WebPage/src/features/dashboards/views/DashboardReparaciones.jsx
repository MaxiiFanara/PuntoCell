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
import { getSucursales } from '../../../services/api';

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

export default function DashboardReparaciones() {
  const [dashboard, setDashboard] = useState(emptyReparacionesDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error("Error al cargar sucursales:", err));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadReparacionesDashboard(seeAll ? null : range, branchId)
      .then((data) => { if (mounted) setDashboard(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll, branchId]);

  const { kpis, periodo, dispositivos, marcas, dispositivoFalla, pareto, distribucionTiempo, tecnicos, matriz } = dashboard;
  
  const periodoData = periodo.series?.[0]?.data ?? [];
  const periodoXAxis = periodo.xAxis?.length > 0 ? periodo.xAxis : periodoData.map((_, index) => index + 1);
  const periodoSeries = periodoXAxis.length === periodoData.length ? periodoData : periodoXAxis.map((_, index) => periodoData[index] ?? 0);

  const maxRevenue = Math.max(...matriz.map(m => m.z), 100);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Reparaciones" meta="Análisis de fallas, tiempos técnicos y rentabilidad del servicio." />
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Reparaciones Totales" value={String(kpis.reparacionesTotales)} sub="Equipos procesados" tone="ok" />
          <KpiCard eyebrow="Tiempo Promedio (MRT)" value={`${kpis.tiempoPromedio} Días`} sub="Desde ingreso a retiro" tone="accent" />
          <KpiCard eyebrow="Tasa de Éxito" value={`${kpis.tasaExito}%`} sub="Sin devoluciones por garantía" tone="info" />
          <KpiCard eyebrow="Margen Global" value={`${kpis.margenGlobal}%`} sub="Rentabilidad operativa" tone="warn" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1.3fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Período">
            <LineChart
              xAxis={[{ scaleType: 'point', data: periodoXAxis, valueFormatter: (v) => String(v), label: 'Período', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ min: 0, label: 'Ingresos Técnicos (Cant.)', width: 'auto', valueFormatter: (v) => String(v) }]} 
              series={[{ 
                data: periodoSeries,
                color: '#12684e', showMark: true, curve: 'linear', label: 'Ingresos Técnicos'
              }]}
              margin={{ top: 20, bottom: 50, left: 30, right: 30 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Distribución de Tiempos (Histograma)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: distribucionTiempo.categorias, label: 'Rango de Días', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Frecuencia (Cant.)' }]}
              series={[{ data: distribucionTiempo.frecuencia, color: '#a39d93', label: 'Cant. Reparaciones' }]}
              margin={{ top: 20, bottom: 50, left: 10, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Dispositivo">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: dispositivos.map(d => d.label), label: 'Dispositivos', width: 'auto', tickLabelStyle: { fontSize: 11 }, colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']} }]}
              xAxis={[{ label: 'Cantidad', width: 'auto', valueFormatter: (v) => String(v) }]}
              series={[{ data: dispositivos.map(d => d.value) }]}
              margin={{ top: 10, bottom: 20, left: 10, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Reparaciones por Marca">
            <BarChart
              xAxis={[{ scaleType: 'band', data: marcas.map(m => m.label), label: 'Marcas', colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']} }]}
              yAxis={[{ label: 'Cantidad', width: 'auto', valueFormatter: (v) => String(v) }]}
              series={[{ data: marcas.map(m => m.value)}]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Pareto de Fallas">
            <ChartsContainer
              series={[
                { type: 'bar', data: pareto.absolutas, yAxisKey: 'leftAxis', color: '#12684e', label: 'Cant. Fallas' },
                { type: 'line', data: pareto.acumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acumulado' }
              ]}
              xAxis={[{ data: pareto.fallas, scaleType: 'band', id: 'x-axis' }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear', min: 0, width: 80, valueFormatter: (v) => String(v), tickLabelStyle: { fontSize: 11 } },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105, width: 60, valueFormatter: (v) => `${v}%`, tickLabelStyle: { fontSize: 11 } }
              ]}
              margin={{ top: 20, bottom: 50, left: 20, right: 60 }}
            >
              <ChartsGrid horizontal />
              <BarPlot />
              <LinePlot />
              <ChartsXAxis axisId="x-axis" label="Fallas" />
              <ChartsYAxis axisId="leftAxis" position="left" label="Cantidad" />
              <ChartsYAxis axisId="rightAxis" position="right" label="% Acumulado" />
              <ChartsTooltip />
            </ChartsContainer>
          </DashboardCard>

          <DashboardCard title="Cruce: Dispositivo vs Tipo de Reparación">
              <BarChart
              xAxis={[{ scaleType: 'band', data: dispositivoFalla.map(d => d.dispositivo ?? d.tipo ?? 'Sin tipo'), label: 'Dispositivos' }]}
              yAxis={[{ label: 'Cant. de Fallas' }]}
              series={[
                { data: dispositivoFalla.map(d => d.pantalla), label: 'Pantalla', color: '#12684e', stack: 'total' },
                { data: dispositivoFalla.map(d => d.bateria), label: 'Batería', color: '#4cbf93', stack: 'total' },
                { data: dispositivoFalla.map(d => d.pinCarga), label: 'Pin Carga', color: '#dfa758', stack: 'total' },
                { data: dispositivoFalla.map(d => d.software), label: 'Software', color: '#a39d93', stack: 'total' }
              ]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'auto' }, gap: { xs: 2, md: 3 } }}>
          {/* <DashboardCard title="Performance Técnico (Éxito vs Devolución)" height={400}>
             <BarChart
                xAxis={[{ scaleType: 'band', data: tecnicos.map(t => t.nombre), label: 'Técnicos' }]}
                yAxis={[{ label: 'Reparaciones (Cant.)' }]}
                series={[
                  { data: tecnicos.map(t => t.exitosas), label: 'Terminadas OK', color: '#12684e' },
                  { data: tecnicos.map(t => t.devueltas), label: 'Devueltas/Garantía', color: '#a93b32' }
                ]}
                margin={{ top: 20, bottom: 50, left: 50, right: 20 }}
              />
          </DashboardCard> */}
          
          {/* <DashboardCard title="Matriz: Demanda vs Rentabilidad" height={400}>
            <ScatterChart
                xAxis={[{ label: '← Baja Demanda | Cantidad de Reparaciones | Alta Demanda →', min: 0 }]}
                yAxis={[{ label: 'Margen de Rentabilidad (%)' }]}
                series={matriz.map((item) => ({
                  type: 'scatter',
                  id: item.id,
                  label: item.servicio,
                  color: item.color,
                  data: [{ x: item.x, y: item.y, z: item.z, id: item.id }], 
                }))}
                margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
                zAxis={[{ data: matriz.map(m => m.z), min: 0, max: maxRevenue }]} 
              />
          </DashboardCard> */}
        </Box>

      </Box>
    </Box>
  );
}
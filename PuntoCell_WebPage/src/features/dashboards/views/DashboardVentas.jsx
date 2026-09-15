import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  PieChart, 
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
import { emptyVentasDashboard, loadVentasDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO (100% WIDTH)
// ==========================================
const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper 
    sx={{ 
      p: { xs: 2, md: 3 }, 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '16px',
      boxShadow: (t) => t.vars.palette.pc.lift, 
      height: '100%',
      width: '100%' // Asegura que la tarjeta tome todo el espacio asignado
    }}
  >
    <Typography 
      variant="h6" 
      sx={{ 
        mb: 2, 
        fontWeight: 700, 
        fontSize: '1.05rem', 
        letterSpacing: '-0.01em' 
      }}
    >
      {title}
    </Typography>
    
    {/* EL TRUCO ESTÁ ACÁ: Forzamos un contenedor con altura fija y posicionamiento absoluto adentro. 
        Esto evita que los gráficos colapsen la grilla. */}
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

// ==========================================
// 3. VISTA PRINCIPAL (CON CSS GRID PURO)
// ==========================================
export default function DashboardVentas() {
  const [dashboard, setDashboard] = useState(emptyVentasDashboard);
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    let mounted = true;
    loadVentasDashboard(seeAll ? null : range)
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll]);

  const { kpis, evolucion, formaPago, categorias, sucursales, empleados, pareto, elasticidad } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Ventas" 
        meta="Análisis de rendimiento comercial y proyecciones." 
      />

      <DashboardRangeFilter
        range={range}
        seeAll={seeAll}
        onChangeFrom={updateFrom}
        onChangeTo={updateTo}
        onToggleSeeAll={toggleSeeAll}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs (Siempre ocupan 100% del ancho) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Facturación Total" value={`U$S ${kpis.facturacionTotal.toLocaleString('es-AR')}`} sub="+14% vs mes anterior" tone="ok" />
          <KpiCard eyebrow="Ticket Promedio" value={`U$S ${kpis.ticketPromedio.toLocaleString('es-AR')}`} sub="Mediana: U$S 290" tone="accent" />
          <KpiCard eyebrow="Operaciones" value={String(kpis.operaciones)} sub="Ventas cerradas" tone="mute" />
          <KpiCard eyebrow="Margen Promedio" value={`${kpis.margenPromedio}%`} sub="General" tone="warn" />
        </Box>

        {/* FILA 2: Evolución y Forma de Pago (Proporción 65% - 35%) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Ventas">
            <LineChart
              xAxis={[{ data: evolucion.xAxis.length > 0 ? evolucion.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => evolucion.xAxis[v-1] || '' }]}
              series={[{ 
                data: evolucion.series[0].data,
                area: true,
                color: '#12684e',
                showMark: true,
                curve: 'linear', // Hace la línea más suave
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas por Forma de Pago">
            <PieChart
              series={[{
                data: formaPago,
                innerRadius: '50%',
                outerRadius: '90%',
                paddingAngle: 3,
                cornerRadius: 6,
              }]}
              margin={{ top: 10, bottom: 50, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Categorías y Sucursales (Mitad y Mitad) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ventas por Categoría (Millones $)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: categorias.map(c => c.label) }]}
              series={[{ data: categorias.map(c => c.value), color: '#12684e' }]}
              margin={{ top: 10, bottom: 25, left: 80, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas vs Margen por Sucursal">
            <BarChart
              xAxis={[{ scaleType: 'band', data: sucursales.map(s => s.nombre) }]}
              series={[
                { data: sucursales.map(s => s.facturacion), label: 'Facturación', color: '#4cbf93' },
                { data: sucursales.map(s => s.margen), label: 'Margen', color: '#dfa758' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Pareto y Empleados (Proporción 60% - 40%) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Pareto de Productos">
            <ChartsContainer
              series={[
                { type: 'bar', data: pareto.ventasAbsolutas, yAxisKey: 'leftAxis', color: '#12684e', label: 'Volumen' },
                { type: 'line', data: pareto.porcentajeAcumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acum.' }
              ]}
              xAxis={[{ data: pareto.productos, scaleType: 'band', id: 'x-axis' }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear' },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105 }
              ]}
              margin={{ top: 20, bottom: 25, left: 50, right: 50 }}
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
          
          <DashboardCard title="Performance por Vendedor">
            <BarChart
              xAxis={[{ scaleType: 'band', data: empleados.map(e => e.nombre) }]}
              series={[
                { data: empleados.map(e => e.ventas), label: 'Ventas (Cant)', color: '#12684e' },
                { data: empleados.map(e => e.ticket), label: 'Ticket ($)', color: '#a39d93' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Elasticidad */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Elasticidad Precio vs Demanda" height={380}>
            <ScatterChart
              xAxis={[{
                min: 0,
                max: Math.max(1, ...elasticidad.map((item) => Number(item.x) || 0)),
                label: 'Precio ($)',
              }]}
              yAxis={[{
                min: 0,
                max: Math.max(1, ...elasticidad.map((item) => Number(item.y) || 0)),
                label: 'Demanda (Unidades)',
              }]}
              series={[
                {
                  data: elasticidad
                    .filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
                    .map((item) => ({
                      x: Number(item.x),
                      y: Number(item.y),
                      id: item.id,
                    })),
                  color: '#dfa758',
                  markerSize: 8,
                },
              ]}
              margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
            />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
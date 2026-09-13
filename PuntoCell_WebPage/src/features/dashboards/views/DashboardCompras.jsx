import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  ScatterChart,
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyComprasDashboard, loadComprasDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO (100% WIDTH)
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
export default function DashboardCompras() {
  const [dashboard, setDashboard] = useState(emptyComprasDashboard);
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    let mounted = true;
    loadComprasDashboard(seeAll ? null : range)
      .then((data) => {
        if (mounted) setDashboard(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll]);

  const { kpis, evolucionCosto, precioProducto, proveedores, dispersionPrecios, abc, inventario, eoq } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Compras" 
        meta="Análisis de costos, proveedores e inventario inteligente." 
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
          <KpiCard eyebrow="Gasto Mensual" value={`U$S ${kpis.gastoMensual.toLocaleString('es-AR')}`} sub="+12% vs mes anterior" tone="warn" />
          <KpiCard eyebrow="Proveedores Activos" value={String(kpis.proveedoresActivos)} sub="Con compras en los últimos 30 días" tone="mute" />
          <KpiCard eyebrow="Cumplimiento Promedio" value={`${kpis.cumplimientoPromedio}%`} sub="Entregas a tiempo" tone="ok" />
          <KpiCard eyebrow="Alertas de Stock" value={String(kpis.alertasStock)} sub="Por debajo del punto de reposición" tone="error" />
        </Box>

        {/* FILA 2: Evolución de Costos (1) y ABC de Compras (6) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Costos de Compra">
            <LineChart
              xAxis={[{ data: evolucionCosto.xAxis.length > 0 ? evolucionCosto.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => evolucionCosto.xAxis[v-1] || '' }]}
              series={[{ 
                data: evolucionCosto.series[0].data,
                area: true, color: '#dfa758', showMark: true, curve: 'linear', label: 'Gasto total'
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Análisis ABC de Compras">
            <PieChart
              series={[{
                data: abc,
                innerRadius: '40%', outerRadius: '90%', paddingAngle: 2, cornerRadius: 4,
              }]}
              margin={{ top: 10, bottom: 50, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Ranking de Proveedores (2 y 3) y Evolución de 1 Producto (4) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ranking de Proveedores (Volumen y Cumplimiento)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: proveedores.map(p => p.nombre) }]}
              series={[
                { data: proveedores.map(p => p.monto), label: 'Monto (Miles $)', color: '#dfa758' },
                { data: proveedores.map(p => p.cumplimiento), label: 'Cumplimiento (%)', color: '#12684e' }
              ]}
              margin={{ top: 10, bottom: 25, left: 100, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Evolución de Precio: iPhone 15">
            <LineChart
              xAxis={[{ data: precioProducto.xAxis.length > 0 ? precioProducto.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => precioProducto.xAxis[v-1] || '' }]}
              series={[{ 
                data: precioProducto.series[0].data,
                color: '#a93b32', showMark: true, label: 'Precio Unitario (U$S)'
              }]}
              margin={{ top: 20, bottom: 25, left: 50, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Rango de Precios (5) y Gestión de Inventario (7 y 8) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Dispersión de Precios por Proveedor">
             {/* Simulación de BoxPlot: Eje X = Proveedor, Eje Y = Precios Ofrecidos */}
             <ScatterChart
                xAxis={[{ 
                  min: 0, max: 5, 
                  tickInterval: [1, 2, 3, 4], 
                  valueFormatter: (v) => ['N/A', 'Prov 1', 'Prov 2', 'Prov 3', 'Prov 4'][v] || ''
                }]}
                yAxis={[{ label: 'Precio Cotizado ($)', min: 800 }]}
                series={[{ data: dispersionPrecios, color: '#a39d93', markerSize: 7 }]}
                margin={{ top: 20, bottom: 25, left: 60, right: 20 }}
              />
          </DashboardCard>

          <DashboardCard title="Análisis de Stock (Actual vs Reposición vs Seguridad)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: inventario.map(i => i.producto) }]}
              series={[
                { data: inventario.map(i => i.stockActual), label: 'Stock Actual', color: '#12684e' },
                { data: inventario.map(i => i.puntoReposicion), label: 'Punto Reposición', color: '#dfa758' },
                { data: inventario.map(i => i.stockSeguridad), label: 'Stock Seguridad', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Modelo EOQ (9) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Análisis EOQ (Cantidad Económica de Pedido)" height={380}>
            <LineChart
              xAxis={[{ 
                data: eoq.cantidades, 
                label: 'Cantidad a ordenar (Unidades)' 
              }]}
              series={[
                { data: eoq.costoMantenimiento, label: 'Costo Mantenimiento', color: '#dfa758', showMark: false },
                { data: eoq.costoPedido, label: 'Costo de Pedido', color: '#4cbf93', showMark: false },
                { data: eoq.costoTotal, label: 'Costo Total (Mínimo = EOQ)', color: '#a93b32', showMark: true }
              ]}
              margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
            />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
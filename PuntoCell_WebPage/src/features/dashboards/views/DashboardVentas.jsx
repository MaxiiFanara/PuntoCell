import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, BarChart, PieChart, ScatterChart, ChartsContainer, BarPlot, LinePlot, ChartsXAxis, ChartsYAxis, ChartsTooltip, ChartsGrid } from '@mui/x-charts';
import dayjs from 'dayjs';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyVentasDashboard, loadVentasDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

const numberFormatter = (value) => Number(value).toLocaleString('es-AR');
const currencyFormatter = (value) => Number(value).toLocaleString('es-AR');

const getCategoryChartHeight = (count) => (count <= 5 ? 340 : Math.max(340, count * 45));
const getEmployeeChartHeight = (count) => (count <= 5 ? 340 : Math.max(340, count * 50));
const getBranchChartHeight = (count) => (count <= 5 ? 340 : Math.max(340, count * 45));

const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, width: '100%', minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em', flexShrink: 0 }}>
      {title}
    </Typography>
    <Box sx={{ position: 'relative', width: '100%', height, minHeight: 0, minWidth: 0 }}>
      <Box sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

export default function DashboardVentas() {
  const [dashboard, setDashboard] = useState(emptyVentasDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error('Error al cargar sucursales:', err));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadVentasDashboard(seeAll ? null : range, branchId)
      .then((data) => { if (mounted) setDashboard(data); })
      .catch((err) => console.error('Error al cargar dashboard:', err));
    return () => { mounted = false; };
  }, [range, seeAll, branchId]);

  const { kpis, evolucion, formaPago, categorias, sucursales, empleados, pareto, elasticidad } = dashboard;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10, boxSizing: 'border-box', minWidth: 0 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Ventas" meta="Análisis de rendimiento comercial y proyecciones." />
      
      <DashboardRangeFilter range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <KpiCard eyebrow="Facturación Total" value={`U$S ${kpis.facturacionTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="+14% vs mes anterior" tone="ok" />
          <KpiCard eyebrow="Ticket Promedio" value={`U$S ${kpis.ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Mediana: U$S 290.00" tone="accent" />
          <KpiCard eyebrow="Operaciones" value={String(kpis.operaciones)} sub="Ventas cerradas" tone="mute" />
          <KpiCard eyebrow="Margen Promedio" value={`${kpis.margenPromedio}%`} sub="General" tone="warn" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <DashboardCard title="Facturación por día" height={390}>
            <LineChart
              xAxis={[{ data: evolucion.xAxis.length > 0 ? evolucion.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => { const date = evolucion.xAxis[v - 1]; return date ? dayjs(date).format('DD/MM/YYYY') : ''; }, label: 'Período', tickLabelInterval: () => true, height: 65, tickLabelStyle: { fontSize: 10 } }]}
              yAxis={[{ label: 'Facturación ($)', width: 'auto', valueFormatter: currencyFormatter, tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: evolucion.series[0].data, color: '#12684e', showMark: true, curve: 'linear' }]}
              margin={{ top: 20, bottom: 50, left: 10, right: 40 }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas por método de cobro" height={390}>
            <PieChart
              series={[{ data: formaPago, innerRadius: '50%', outerRadius: '90%', paddingAngle: 3, cornerRadius: 6 }]}
              margin={{ top: 10, bottom: 60, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' }, padding: 0 } }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <DashboardCard title="Ventas por Categoría" height={getCategoryChartHeight(categorias.length)}>
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: categorias.map((c) => c.label), label: 'Categorías', width: 'auto', tickLabelInterval: () => true, tickLabelStyle: { fontSize: 11 }, colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']}}]}
              xAxis={[{ label: 'Ventas ($)', valueFormatter: numberFormatter, tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: categorias.map((c) => c.value) }]}
              margin={{ top: 10, bottom: 40, left: 10, right: 30 }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas por Sucursal" height={getBranchChartHeight(sucursales.length)}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: sucursales.map((s) => s.nombre), label: 'Sucursales', tickLabelInterval: () => true, height: 65, tickLabelStyle: { fontSize: 11 }, colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']}}]}
              yAxis={[{ label: 'Facturación ($)', width: 'auto', valueFormatter: currencyFormatter, tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: sucursales.map((s) => s.facturacion)}]}
              margin={{ top: 20, bottom: 30, left: 10, right: 20 }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <DashboardCard title="Pareto de Productos" height={450}>
            <ChartsContainer
              series={[
                { type: 'bar', data: pareto.ventasAbsolutas.map((v, i) => (pareto.porcentajeAcumulado[i] <= 80 ? v : 0)), yAxisKey: 'leftAxis', color: '#12684e', label: '80% Principal', stack: 'pareto' },
                { type: 'bar', data: pareto.ventasAbsolutas.map((v, i) => (pareto.porcentajeAcumulado[i] > 80 ? v : 0)), yAxisKey: 'leftAxis', color: '#a39d93', label: '20% Restante', stack: 'pareto' },
                { type: 'line', data: pareto.porcentajeAcumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acumulado' },
              ]}
              xAxis={[{ data: pareto.productos, scaleType: 'band', id: 'x-axis', tickLabelInterval: () => true, tickLabelStyle: { fontSize: 10, angle: -45, textAnchor: 'end' }, height: 90 }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear', width: 100, valueFormatter: numberFormatter, tickLabelStyle: { fontSize: 11 } },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105, width: 55, valueFormatter: (v) => `${v}%`, tickLabelStyle: { fontSize: 11 } },
              ]}
              margin={{ top: 20, bottom: 40, left: 10, right: 60 }}
            >
              <ChartsGrid horizontal />
              <BarPlot />
              <LinePlot />
              <ChartsXAxis axisId="x-axis" label="Productos" />
              <ChartsYAxis axisId="leftAxis" position="left" label="Volumen de Ventas ($)" />
              <ChartsYAxis axisId="rightAxis" position="right" label="Acumulado (%)" />
              <ChartsTooltip />
            </ChartsContainer>
          </DashboardCard>
          
          <DashboardCard title="Performance por Vendedor" height={getEmployeeChartHeight(empleados.length)}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: empleados.map((e) => e.nombre), label: 'Vendedores', tickLabelInterval: () => true, height: 65, tickLabelStyle: { fontSize: 10 } }]}
              yAxis={[
                { id: 'ventas', label: 'Ventas (Cantidad)', width: 'auto', valueFormatter: numberFormatter, tickLabelStyle: { fontSize: 11 }, min: 0, max: Math.max(1, ...empleados.map((e) => Number(e.ventas) || 0)) },
                { id: 'ticket', label: 'Ticket ($)', position: 'right', width: 'auto', valueFormatter: currencyFormatter, tickLabelStyle: { fontSize: 11 }, min: 0, max: Math.max(1, ...empleados.map((e) => Number(e.ticket) || 0)) },
              ]}
              series={[
                { data: empleados.map((e) => e.ventas), label: 'Ventas (Cant)', color: '#12684e', yAxisId: 'ventas' },
                { data: empleados.map((e) => e.ticket), label: 'Ticket ($)', color: '#a39d93', yAxisId: 'ticket' },
              ]}
              margin={{ top: 20, bottom: 0, left: 10, right: 20 }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
        </Box>

        {/* <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <DashboardCard title="Elasticidad Precio vs Demanda" height={420}>
            <ScatterChart
              xAxis={[{ min: 0, max: Math.max(1, ...elasticidad.map((item) => Number(item.x) || 0)), label: 'Precio Cotizado ($)', valueFormatter: currencyFormatter, width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ min: 0, max: Math.max(1, ...elasticidad.map((item) => Number(item.y) || 0)), label: 'Demanda (Unidades)', valueFormatter: numberFormatter, width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[{
                data: elasticidad.filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y))).map((item) => ({ x: Number(item.x), y: Number(item.y), id: item.id, nombre: item.nombre })),
                color: '#dfa758',
                markerSize: 8,
                valueFormatter: (v) => `${v?.nombre ? v.nombre + '\n' : ''}Precio: $${v?.x?.toLocaleString('es-AR')}\nDemanda: ${v?.y?.toLocaleString('es-AR')}`,
              }]}
              margin={{ top: 20, bottom: 75, left: 10, right: 40 }}
              sx={{ width: '100%', height: '100%' }}
            />
          </DashboardCard>
        </Box> */}
      </Box>
    </Box>
  );
}
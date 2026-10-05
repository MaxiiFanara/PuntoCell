import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, Divider } from '@mui/material';
import { LineChart, BarChart, PieChart, ChartsContainer, BarPlot, LinePlot, ChartsXAxis, ChartsYAxis, ChartsTooltip, ChartsGrid } from '@mui/x-charts';
import dayjs from 'dayjs';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

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

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

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
  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyVentasDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error('Error al cargar sucursales:', err));
  }, []);

  const handleToggleCompare = (checked) => {
    setIsComparing(checked);
    if (checked && compareBranches.length === 0) {
      const preseleccion = [branchId];
      if (sucursalesLista.length > 0 && branchId !== '') preseleccion.push('');
      else if (sucursalesLista.length > 0) preseleccion.push(sucursalesLista[0].id);
      setCompareBranches([...new Set(preseleccion)]);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    if (isComparing) {
      if (compareBranches.length > 0) {
        Promise.all(compareBranches.map(id => loadVentasDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyVentasDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      loadVentasDashboard(seeAll ? null : range, branchId)
        .then((data) => { if (mounted) setDashboard(data); })
        .catch((err) => console.error('Error al cargar dashboard:', err));
    }
    
    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);

  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const { kpis, evolucion, formaPago, categorias, sucursales, empleados, pareto, abc = { grafico: [], topA: [] }, margenes = [] } = dashboard;

    return (
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
          
          <DashboardCard title="Margen de Rentabilidad Promedio (%)" height={420}>
            {margenes && margenes.length > 0 ? (
              <BarChart layout="horizontal" yAxis={[{ scaleType: 'band', data: margenes.map((m) => m.categoria), label: 'Categorías', width: 'auto', tickLabelStyle: { fontSize: 11 } }]} xAxis={[{ label: 'Margen Neto (%)', valueFormatter: (v) => `${v}%`, max: 100, tickLabelStyle: { fontSize: 11 } }]} series={[{ data: margenes.map((m) => m.margenPct), color: '#dfa758', label: 'Margen de Ganancia (%)' }]} margin={{ top: 10, bottom: 50, left: 10, right: 30 }} sx={{ width: '100%', height: '100%' }} />
            ) : ( <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>No hay datos de rentabilidad para este período</Box> )}
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

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 }, minWidth: 0 }}>
          <DashboardCard title="Análisis ABC (Top Productos)" height={420}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, height: '100%', alignItems: 'center' }}>
              <Box sx={{ width: { xs: '100%', xl: '45%' }, height: { xs: 180, xl: '100%' } }}>
                {abc.grafico && abc.grafico.length > 0 ? (
                  <PieChart series={[{ data: abc.grafico, innerRadius: '40%', outerRadius: '80%', paddingAngle: 4, cornerRadius: 5, highlightScope: { faded: 'global', highlighted: 'item' }, faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' }, }]} margin={{ top: 10, bottom: 30, left: 10, right: 10 }} slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' }, padding: 0 } }} />
                ) : ( <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>Sin datos</Box> )}
              </Box>
              <Box sx={{ width: { xs: '100%', xl: '55%' }, pl: { xl: 2 }, mt: { xs: 2, xl: 0 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#12684e', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>Productos Estrella (Clase A)</Typography>
                <List dense disablePadding>
                  {abc.topA && abc.topA.length > 0 ? (
                    abc.topA.map((prod, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pr: 1 }}>{idx + 1}. {prod.nombre}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>${prod.valor.toLocaleString('es-AR')}</Typography>
                      </ListItem>
                    ))
                  ) : ( <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No hay productos registrados</Typography> )}
                </List>
              </Box>
            </Box>
          </DashboardCard>

          <DashboardCard title="Rentabilidad por Categoría (Costo vs Ganancia Neta)" height={420}>
            {margenes && margenes.length > 0 ? (
              <BarChart layout="horizontal" yAxis={[{ scaleType: 'band', data: margenes.map((m) => m.categoria), label: 'Categorías', width: 'auto', tickLabelStyle: { fontSize: 11 } }]} xAxis={[{ label: 'Monto Facturado ($)', valueFormatter: currencyFormatter, tickLabelStyle: { fontSize: 11 } }]} series={[ { data: margenes.map((m) => m.costos), color: '#a93b32', label: 'Costo (Repuestos/Insumos)', stack: 'total' }, { data: margenes.map((m) => m.ganancia), color: '#12684e', label: 'Ganancia Neta (Limpia)', stack: 'total' } ]} margin={{ top: 10, bottom: 50, left: 10, right: 30 }} sx={{ width: '100%', height: '100%' }} />
            ) : ( <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>No hay datos de rentabilidad para este período</Box> )}
          </DashboardCard>

        </Box>
        
        <Box>
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
        </Box>
      </Box>
    );
  };


  // ================= VISTA COMPARATIVA (NUEVA) =================
  const renderVistaComparacion = () => {
    if (compareBranches.length === 0) return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
        <Typography color="text.secondary">Selecciona al menos una sucursal en el filtro para comenzar la comparación.</Typography>
      </Paper>
    );

    const renderApilado = (formatearValor) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, mb: 1 }}>
        {compareBranches.map((id, index) => {
          const d = dashboardsMulti[id] || emptyVentasDashboard;
          const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
          const nombre = sucursal ? sucursal.nombre : 'Global';
          return (
            <Box key={`kpi-${id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: PALETA_COMPARACION[index % PALETA_COMPARACION.length] }}>{nombre}:</Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: 'text.primary' }}>{formatearValor(d)}</Typography>
            </Box>
          );
        })}
      </Box>
    );

    // 1. Gráfico de Líneas (Evolución de Facturación)
    const baseDash = dashboardsMulti[compareBranches[0]] || emptyVentasDashboard;
    const xAxisData = baseDash.evolucion.xAxis.length > 0 ? baseDash.evolucion.xAxis.map((_, i) => i + 1) : [1,2,3,4,5,6,7];
    const seriesLine = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const d = dashboardsMulti[id] || emptyVentasDashboard;
      return { 
        data: d.evolucion.series[0]?.data ?? [], 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global', 
        showMark: true 
      };
    });

    // 2. Gráfico de Barras (Ventas por Categoría)
    const allCatSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.categorias || []).forEach(c => allCatSet.add(c.label)); });
    const allCategorias = Array.from(allCatSet);
    const seriesCat = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const cMap = new Map((dashboardsMulti[id]?.categorias || []).map(item => [item.label, item.value]));
      return { data: allCategorias.map(lbl => cMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    // 3. Gráfico de Barras Horizontales (Margen por Categoría)
    const allMargenSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.margenes || []).forEach(m => allMargenSet.add(m.categoria)); });
    const allMargenesCat = Array.from(allMargenSet);
    const seriesMargen = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const mMap = new Map((dashboardsMulti[id]?.margenes || []).map(item => [item.categoria, item.margenPct]));
      return { data: allMargenesCat.map(lbl => mMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Facturación Total" value={renderApilado((d) => `U$S ${d.kpis.facturacionTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)} sub="Ingresos netos" tone="ok" />
          <KpiCard eyebrow="Ticket Promedio" value={renderApilado((d) => `U$S ${d.kpis.ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)} sub="Por operación" tone="accent" />
          <KpiCard eyebrow="Operaciones" value={renderApilado((d) => String(d.kpis.operaciones))} sub="Ventas cerradas" tone="mute" />
          <KpiCard eyebrow="Margen Promedio" value={renderApilado((d) => `${d.kpis.margenPromedio}%`)} sub="General" tone="warn" />
        </Box>

        {/* Fila Dividida: Categorías y Margen (Lado a lado en pantallas grandes) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          
          <DashboardCard title="Volumen de Ventas por Categoría">
            <BarChart 
              xAxis={[{ scaleType: 'band', data: allCategorias, tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Ventas ($)', valueFormatter: numberFormatter, tickLabelStyle: { fontSize: 11 } }]}
              series={seriesCat} 
              margin={{ top: 20, bottom: 50, left: 10, right: 30 }} 
            />
          </DashboardCard>

          <DashboardCard title="Comparativa de Margen de Rentabilidad (%)" height={getCategoryChartHeight(allMargenesCat.length)}>
            {allMargenesCat.length > 0 ? (
              <BarChart 
                layout="horizontal"
                yAxis={[{ scaleType: 'band', data: allMargenesCat, label: 'Categorías', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
                xAxis={[{ label: 'Margen Neto (%)', valueFormatter: (v) => `${v}%`, max: 100, tickLabelStyle: { fontSize: 11 } }]}
                series={seriesMargen} 
                margin={{ top: 10, bottom: 50, left: 10, right: 30 }} 
              />
            ) : (
              <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>No hay datos de rentabilidad</Box>
            )}
          </DashboardCard>

        </Box>

        {/* Fila Completa: Evolución (Abajo y a todo lo ancho) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Facturación">
            <LineChart 
              xAxis={[{ data: xAxisData, valueFormatter: (v) => { const date = baseDash.evolucion.xAxis[v - 1]; return date ? dayjs(date).format('DD/MM/YYYY') : ''; }, label: 'Período', tickLabelInterval: () => true, tickLabelStyle: { fontSize: 10 } }]}
              yAxis={[{ label: 'Facturación ($)', width: 'auto', valueFormatter: currencyFormatter, tickLabelStyle: { fontSize: 11 } }]}
              series={seriesLine} 
              margin={{ top: 20, bottom: 50, left: 10, right: 40 }} 
            />
          </DashboardCard>
        </Box>

      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10, boxSizing: 'border-box', minWidth: 0 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Ventas" meta="Análisis de rendimiento comercial y proyecciones." />
      
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
        isComparing={isComparing} onToggleCompare={handleToggleCompare}
        compareBranches={compareBranches} onChangeCompareBranches={setCompareBranches}
      />

      {isComparing ? renderVistaComparacion() : renderVistaNormal()}
    </Box>
  );
}
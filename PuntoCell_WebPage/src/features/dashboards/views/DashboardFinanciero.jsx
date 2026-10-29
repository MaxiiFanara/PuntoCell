import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart, LineChart, ChartsGrid } from '@mui/x-charts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyFinancieroDashboard, loadFinancieroDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

const DashboardCard = ({ title, children, height = 350 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, height: '100%', width: '100%' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</Box>
    </Box>
  </Paper>
);

export default function DashboardFinanciero() {
  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyFinancieroDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(180);

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});

  useEffect(() => {
    getSucursales().then((data) => setSucursalesLista(data)).catch((err) => console.error("Error al cargar sucursales:", err));
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
        Promise.all(compareBranches.map(id => loadFinancieroDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyFinancieroDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      loadFinancieroDashboard(seeAll ? null : range, branchId)
        .then((data) => { if (mounted) setDashboard(data); })
        .catch(() => {});
    }
    
    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);

  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const { kpis, ingresosEgresos, margenProducto, margenCategoria, rentabilidadMarca } = dashboard;

    return (
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
              xAxis={[{ scaleType: 'band', data: margenCategoria.map(c => c.categoria), label: 'Categorías' , width: 'auto', tickLabelStyle: { fontSize: 11 },colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']}}]}
              yAxis={[{ label: 'Monto ($)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: margenCategoria.map(c => c.costo), label: 'Costo', color: '#a39d93', stack: 'total' },
                { data: margenCategoria.map(c => c.margenNeto), label: 'Margen Neto', stack: 'total' }
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
              ]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>

          <DashboardCard title="Ranking de Rentabilidad por Marca (U$S)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: rentabilidadMarca.map(m => m.marca), label: 'Marcas', width: 'auto', tickLabelStyle: { fontSize: 11 },colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']} }]}
              xAxis={[{ label: 'Rentabilidad ($)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: rentabilidadMarca.map(m => m.rentabilidad) }]}
              margin={{ top: 10, bottom: 20, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>
      </Box>
    );
  };

  // ================= VISTA COMPARATIVA =================
  const renderVistaComparacion = () => {
    if (compareBranches.length === 0) return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
        <Typography color="text.secondary">Selecciona al menos una sucursal en el filtro para comenzar la comparación.</Typography>
      </Paper>
    );

    const renderApilado = (formatearValor) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, mb: 1 }}>
        {compareBranches.map((id, index) => {
          const d = dashboardsMulti[id] || emptyFinancieroDashboard;
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

    // 1. Gráfico de Líneas (Flujo Neto Mensual: Ingresos - Egresos)
    // Períodos de todas las sucursales (cada una puede tener meses distintos): se alinean por período
    const periodosSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.ingresosEgresos?.meses || []).forEach(m => periodosSet.add(m)); });
    const xAxisMeses = Array.from(periodosSet).sort();
    const seriesFlujoNeto = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const ie = dashboardsMulti[id]?.ingresosEgresos;
      const netoPorPeriodo = new Map((ie?.meses || []).map((mes, i) => [mes, (ie.ingresos?.[i] || 0) - (ie.egresos?.[i] || 0)]));

      return { 
        data: xAxisMeses.map(mes => netoPorPeriodo.get(mes) || 0), 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global', 
        showMark: true 
      };
    });

    // 2. Gráfico de Barras Horizontales (Rentabilidad por Marca)
    const allMarcasSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.rentabilidadMarca || []).forEach(m => allMarcasSet.add(m.marca)); });
    const allMarcas = Array.from(allMarcasSet);
    const seriesRentabilidad = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const mMap = new Map((dashboardsMulti[id]?.rentabilidadMarca || []).map(item => [item.marca, item.rentabilidad]));
      return { data: allMarcas.map(lbl => mMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    // 3. Gráfico de Barras (Margen Neto por Categoría)
    const allCatSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.margenCategoria || []).forEach(c => allCatSet.add(c.categoria)); });
    const allCategorias = Array.from(allCatSet);
    const seriesMargenCat = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const cMap = new Map((dashboardsMulti[id]?.margenCategoria || []).map(item => [item.categoria, item.margenNeto]));
      return { data: allCategorias.map(lbl => cMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa (Desempeño Financiero)</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Ingresos Totales" value={renderApilado((d) => `U$S ${d.kpis?.ingresosTotales?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}`)} sub="Acumulado" tone="ok" />
          <KpiCard eyebrow="Egresos Totales" value={renderApilado((d) => `U$S ${d.kpis?.egresosTotales?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}`)} sub="Acumulado" tone="error" />
          <KpiCard eyebrow="Flujo Neto" value={renderApilado((d) => `U$S ${d.kpis?.flujoNeto?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}`)} sub="Caja disponible" tone="info" />
          <KpiCard eyebrow="Margen Promedio" value={renderApilado((d) => `${d.kpis?.margenPromedio || 0}%`)} sub="Global" tone="accent" />
        </Box>

        {/* Gráficos Compartidos Lado a Lado (Rentabilidad y Margen) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ranking Comparativo: Rentabilidad por Marca">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: allMarcas, label: 'Marcas', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              xAxis={[{ label: 'Rentabilidad ($)', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesRentabilidad}
              margin={{ top: 20, bottom: 50, left: 30, right: 30 }}
            />
          </DashboardCard>

          <DashboardCard title="Margen Neto Ganado por Categoría">
            <BarChart
              xAxis={[{ scaleType: 'band', data: allCategorias, label: 'Categorías', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Margen Neto ($)', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesMargenCat}
              margin={{ top: 20, bottom: 50, left: 30, right: 30 }}
            />
          </DashboardCard>
        </Box>

        {/* Gráfico Macro: Flujo Neto Mensual (Ancho Completo) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución del Flujo Neto (Ingresos - Egresos)">
            <LineChart
              xAxis={[{ scaleType: 'band', data: xAxisMeses, label: 'Período', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Flujo Neto (U$S)', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesFlujoNeto}
              margin={{ top: 20, bottom: 50, left: 40, right: 40 }}
            >
              <ChartsGrid horizontal />
            </LineChart>
          </DashboardCard>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo Financiero" meta="Flujo de caja, ingresos, egresos y análisis de márgenes." />
      
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
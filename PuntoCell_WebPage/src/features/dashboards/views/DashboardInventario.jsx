import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyInventarioDashboard, loadInventarioDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

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

export default function DashboardInventario() {
  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyInventarioDashboard);
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
      .catch((err) => console.error("Error al cargar sucursales:", err));
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
        Promise.all(compareBranches.map(id => loadInventarioDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyInventarioDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      // Se agregó branchId a la carga normal para que filtre si no está comparando
      loadInventarioDashboard(seeAll ? null : range, branchId)
        .then((data) => { if (mounted) setDashboard(data); })
        .catch(() => {});
    }

    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);


  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const { kpis, aging, valorizacion } = dashboard;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Artículos" value={String(kpis.totalArticulos)} sub="Artículos en inventario" tone="mute" />
          <KpiCard eyebrow="Capital Inmovilizado" value={`U$S ${kpis.capitalInmovilizado.toLocaleString('es-AR')}`} sub="Valorización a costo" tone="info" />
          <KpiCard eyebrow="Riesgo de Obsolescencia" value={String(kpis.riesgoObsolescencia)} sub="Productos con +90 días" tone="error" />
          <KpiCard eyebrow="Índice de Rotación" value={String(kpis.indiceRotacion)} sub="Veces por año" tone="ok" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Productos sin movimiento (Cantidades)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: aging.categorias, label: 'Días sin registrar ventas', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Cant. de Productos', tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: aging.cantidades, label: 'Cantidad', color: '#12684e' }]}
              margin={{ top: 20, bottom: 50, left: 50, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Valorización del Stock Estancado (U$S)">
            <PieChart
              series={[{ data: valorizacion, innerRadius: '45%', outerRadius: '85%', paddingAngle: 2, cornerRadius: 4 }]}
              margin={{ top: 10, bottom: 70, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
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
          const d = dashboardsMulti[id] || emptyInventarioDashboard;
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

    // 1. Gráfico de Barras: Aging Cantidades
    const baseDash = dashboardsMulti[compareBranches[0]] || emptyInventarioDashboard;
    const xAxisAging = baseDash.aging?.categorias || ['0-30', '31-60', '61-90', '+90'];
    const seriesAging = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const d = dashboardsMulti[id] || emptyInventarioDashboard;
      return { 
        data: d.aging?.cantidades || [], 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global' 
      };
    });

    // 2. Gráfico de Barras (Convertido de PieChart): Valorización Financiera
    const allValSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.valorizacion || []).forEach(v => allValSet.add(v.label)); });
    const allValLabels = Array.from(allValSet);
    const seriesValorizacion = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const vMap = new Map((dashboardsMulti[id]?.valorizacion || []).map(item => [item.label, item.value]));
      return { 
        data: allValLabels.map(lbl => vMap.get(lbl) || 0), 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global' 
      };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa (Inventario)</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Artículos" value={renderApilado((d) => String(d.kpis?.totalArticulos || 0))} sub="Artículos en inventario" tone="mute" />
          <KpiCard eyebrow="Capital Inmovilizado" value={renderApilado((d) => `U$S ${d.kpis?.capitalInmovilizado?.toLocaleString('es-AR') || '0'}`)} sub="Valor a costo" tone="info" />
          <KpiCard eyebrow="Riesgo de Obsolescencia" value={renderApilado((d) => String(d.kpis?.riesgoObsolescencia || 0))} sub="Productos con +90 días" tone="error" />
          <KpiCard eyebrow="Índice de Rotación" value={renderApilado((d) => String(d.kpis?.indiceRotacion || 0))} sub="Veces por año" tone="ok" />
        </Box>

        {/* Gráficos Comparativos Lado a Lado */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Aging Físico: Productos sin movimiento">
            <BarChart
              xAxis={[{ scaleType: 'band', data: xAxisAging, label: 'Días sin movimiento', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Cant. de Productos', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesAging}
              margin={{ top: 20, bottom: 50, left: 50, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Impacto Financiero: Stock Estancado (U$S)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: allValLabels, tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Capital Inmovilizado (U$S)', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesValorizacion}
              margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
            />
          </DashboardCard>
        </Box>

      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Inventario" 
        meta="Análisis de antigüedad (Aging) y rotación de productos." 
      />

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
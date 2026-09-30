import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import dayjs from 'dayjs';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getCajaResumen, getSucursales } from '../../../services/api';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, width: '100%', height: '100%', boxSizing: 'border-box' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em', flexShrink: 0 }}>
      {title}
    </Typography>
    <Box sx={{ position: 'relative', width: '100%', height, minHeight: 0 }}>
      <Box sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

const currencyFormatter = (value) => `$ ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

export default function DashboardCaja() {
  // ================= ESTADOS VISTA NORMAL =================
  const [resumen, setResumen] = useState(null);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30); 

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});

  useEffect(() => {
    getSucursales().then(setSucursalesLista).catch(console.error);
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
        Promise.all(compareBranches.map(id => {
          const params = {
            desde: seeAll ? undefined : range.from,
            hasta: seeAll ? undefined : range.to,
            idSucursal: id || undefined,
          };
          return getCajaResumen(params);
        }))
        .then(results => {
          if (!mounted) return;
          const newDash = {};
          compareBranches.forEach((id, index) => { 
            newDash[id] = results[index] || { totals: { ingresos: 0, egresos: 0, totalNeto: 0, movimientos: 0 }, series: [] }; 
          });
          setDashboardsMulti(newDash);
        }).catch(console.error);
      }
    } else {
      const params = {
        desde: seeAll ? undefined : range.from,
        hasta: seeAll ? undefined : range.to,
        idSucursal: branchId || undefined,
      };
      getCajaResumen(params)
        .then((resData) => { if (mounted) setResumen(resData); })
        .catch(() => {});
    }

    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);

  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const kpis = resumen?.totals || { ingresos: 0, egresos: 0, totalNeto: 0, movimientos: 0 };
    const series = resumen?.series || [];
    
    const chartXAxis = series.length > 0 ? series.map((_, i) => i + 1) : [1, 2, 3];
    const formatXAxis = (v) => series[v-1]?.period ? dayjs(series[v-1].period).format('DD/MMM') : '';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Ingresos" value={currencyFormatter(kpis.ingresos)} sub="Ventas y entradas" tone="ok" />
          <KpiCard eyebrow="Total Egresos" value={currencyFormatter(kpis.egresos)} sub="Gastos y retiros" tone="error" />
          <KpiCard eyebrow="Flujo Neto" value={currencyFormatter(kpis.totalNeto)} sub="Balance del período" tone="info" />
          <KpiCard eyebrow="Movimientos" value={String(kpis.movimientos)} sub="Operaciones registradas" tone="mute" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución del Flujo Neto" height={400}>
            <LineChart
              xAxis={[{ data: chartXAxis, valueFormatter: formatXAxis, tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: 11 }, height: 60 }]}
              yAxis={[{ valueFormatter: (v) => v.toLocaleString('es-AR'), width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: series.length > 0 ? series.map(s => s.totalNeto) : [0,0,0], color: '#12684e', showMark: true, curve: 'linear', area: true }]}
              margin={{ top: 20, bottom: 60, left: 70, right: 20 }}
            />
          </DashboardCard>

          <DashboardCard title="Comparativa: Ingresos vs Egresos" height={400}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: chartXAxis, valueFormatter: formatXAxis, tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: 11 }, height: 60 }]}
              yAxis={[{ valueFormatter: (v) => v.toLocaleString('es-AR'), width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: series.length > 0 ? series.map(s => s.ingresos) : [0,0,0], label: 'Ingresos', color: '#4cbf93' },
                { data: series.length > 0 ? series.map(s => s.egresos) : [0,0,0], label: 'Egresos', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 60, left: 70, right: 20 }}
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
          const d = dashboardsMulti[id] || { totals: { ingresos: 0, egresos: 0, totalNeto: 0, movimientos: 0 } };
          const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
          const nombre = sucursal ? sucursal.nombre : 'Global';
          return (
            <Box key={`kpi-${id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: PALETA_COMPARACION[index % PALETA_COMPARACION.length] }}>{nombre}:</Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: 'text.primary' }}>{formatearValor(d.totals)}</Typography>
            </Box>
          );
        })}
      </Box>
    );

    // 1. Gráfico de Líneas: Evolución del Flujo Neto
    const baseDash = dashboardsMulti[compareBranches[0]];
    const baseSeries = baseDash?.series || [];
    const chartXAxis = baseSeries.length > 0 ? baseSeries.map((_, i) => i + 1) : [1, 2, 3];
    const formatXAxis = (v) => baseSeries[v-1]?.period ? dayjs(baseSeries[v-1].period).format('DD/MMM') : '';

    const seriesFlujo = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const sData = dashboardsMulti[id]?.series || [];
      return { 
        data: sData.length > 0 ? sData.map(s => s.totalNeto) : [], 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global', 
        showMark: true,
        curve: 'linear'
      };
    });

    // 2. Gráfico de Barras: Acumulado Ingresos vs Egresos por Sucursal
    const etiquetasSucursales = compareBranches.map(id => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      return sucursal ? sucursal.nombre : 'Global';
    });
    
    const totalesIngresos = compareBranches.map(id => (dashboardsMulti[id]?.totals?.ingresos || 0));
    const totalesEgresos = compareBranches.map(id => (dashboardsMulti[id]?.totals?.egresos || 0));

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa (Caja y Liquidez)</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Ingresos" value={renderApilado((t) => currencyFormatter(t?.ingresos || 0))} sub="Ventas y entradas" tone="ok" />
          <KpiCard eyebrow="Total Egresos" value={renderApilado((t) => currencyFormatter(t?.egresos || 0))} sub="Gastos y retiros" tone="error" />
          <KpiCard eyebrow="Flujo Neto" value={renderApilado((t) => currencyFormatter(t?.totalNeto || 0))} sub="Balance del período" tone="info" />
          <KpiCard eyebrow="Movimientos" value={renderApilado((t) => String(t?.movimientos || 0))} sub="Operaciones" tone="mute" />
        </Box>

        {/* Gráficos Comparativos */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución del Flujo Neto" height={400}>
            <LineChart
              xAxis={[{ data: chartXAxis, valueFormatter: formatXAxis, tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: 11 }, height: 60 }]}
              yAxis={[{ valueFormatter: (v) => v.toLocaleString('es-AR'), width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesFlujo}
              margin={{ top: 20, bottom: 60, left: 70, right: 20 }}
            />
          </DashboardCard>

          <DashboardCard title="Acumulado: Ingresos vs Egresos" height={400}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: etiquetasSucursales, tickLabelStyle: { fontSize: 11 }, height: 60 }]}
              yAxis={[{ valueFormatter: (v) => v.toLocaleString('es-AR'), width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: totalesIngresos, label: 'Total Ingresos', color: '#4cbf93' },
                { data: totalesEgresos, label: 'Total Egresos', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 60, left: 70, right: 20 }}
            />
          </DashboardCard>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Estadísticas" title="Dashboard de Caja" meta="Análisis de tendencias financieras y flujo de efectivo." />
      
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
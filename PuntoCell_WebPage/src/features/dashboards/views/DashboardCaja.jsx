import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import dayjs from 'dayjs';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getCajaResumen, getSucursales } from '../../../services/api';

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
  const [resumen, setResumen] = useState(null);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30); 

  useEffect(() => {
    getSucursales().then(setSucursalesLista).catch(console.error);
  }, []);

  useEffect(() => {
    let mounted = true;
    const params = {
      desde: seeAll ? undefined : range.from,
      hasta: seeAll ? undefined : range.to,
      idSucursal: branchId || undefined,
    };

    getCajaResumen(params)
      .then((resData) => { if (mounted) setResumen(resData); })
      .catch(() => {});

    return () => { mounted = false; };
  }, [range, seeAll, branchId]);

  const kpis = resumen?.totals || { ingresos: 0, egresos: 0, totalNeto: 0, movimientos: 0 };
  const series = resumen?.series || [];
  
  const chartXAxis = series.length > 0 ? series.map((_, i) => i + 1) : [1, 2, 3];
  const formatXAxis = (v) => series[v-1]?.period ? dayjs(series[v-1].period).format('DD/MMM') : '';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Estadísticas" title="Dashboard de Caja" meta="Análisis de tendencias financieras y flujo de efectivo." />
      
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
      />

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
    </Box>
  );
}
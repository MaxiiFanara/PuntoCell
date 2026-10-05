import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Tooltip, useTheme } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyControlDashboard, loadControlDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

// ==========================================
// 2. COMPONENTES WRAPPER & HEATMAP CUSTOM
// ==========================================
const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, height: '100%', width: '100%' }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</Box>
    </Box>
  </Paper>
);

const MatrizAuditoria = ({ data }) => {
  if (!data || data.length === 0) return <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>Sin operaciones registradas</Box>;

  const columnas = ['Ventas', 'Compras', 'Anulaciones', 'Descuentos'];
  
  const maximos = {
    Ventas: Math.max(...data.map(d => d.Ventas || 0), 1),
    Compras: Math.max(...data.map(d => d.Compras || 0), 1),
    Anulaciones: Math.max(...data.map(d => d.Anulaciones || 0), 1),
    Descuentos: Math.max(...data.map(d => d.Descuentos || 0), 1),
  };

  const getCellColor = (columna, valor) => {
    if (!valor || valor === 0) return 'transparent';
    const intensidad = Math.max(0.15, valor / maximos[columna]); 
    if (columna === 'Anulaciones') return `rgba(169, 59, 50, ${intensidad})`; 
    if (columna === 'Descuentos') return `rgba(223, 167, 88, ${intensidad})`; 
    return `rgba(28, 163, 116, ${intensidad})`; 
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflowY: 'auto', pr: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 1, mb: 1 }}>
        <Box />
        {columnas.map(col => (
          <Typography key={col} sx={{ fontSize: '.75rem', fontWeight: 600, textAlign: 'center', color: 'text.secondary' }}>{col}</Typography>
        ))}
      </Box>
      {data.map((row, i) => (
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.empleado}
          </Typography>
          {columnas.map(col => (
            <Tooltip key={col} title={`${row.empleado}: ${row[col] || 0} ${col}`} arrow placement="top">
              <Box 
                sx={{ 
                  height: 38, borderRadius: 1.5, bgcolor: getCellColor(col, row[col]),
                  border: '1px solid', borderColor: (!row[col] || row[col] === 0) ? 'divider' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.05)', cursor: 'pointer', borderColor: 'text.primary' }
                }}
              >
                <Typography sx={{ fontSize: '.75rem', fontWeight: 700, color: (row[col] || 0) > (maximos[col]*0.5) ? '#fff' : 'text.primary' }}>
                  {row[col] || 0}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default function DashboardControl() {
  const theme = useTheme();

  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyControlDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});

  useEffect(() => {
    getSucursales().then((data) => setSucursalesLista(data)).catch(console.error);
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
        Promise.all(compareBranches.map(id => loadControlDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyControlDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      loadControlDashboard(seeAll ? null : range, branchId)
        .then((data) => { if (mounted) setDashboard(data); })
        .catch(() => {});
    }
    
    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);

  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const { kpis, heatmap, evolucionRiesgo } = dashboard;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Operaciones Totales" value={String(kpis.operacionesTotales)} sub="Registradas en sistema" tone="mute" />
          <KpiCard eyebrow="Anulaciones" value={String(kpis.anulaciones)} sub="4.1% del total" tone="error" />
          <KpiCard eyebrow="Descuentos Aplicados" value={String(kpis.descuentosAplicados)} sub="U$S 1,250 cedidos" tone="warn" />
          <KpiCard eyebrow="Usuarios Activos" value={String(kpis.usuariosActivos)} sub="Operando en el período" tone="info" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Matriz Empleado x Operación (Heatmap)" height={320}>
            <MatrizAuditoria data={heatmap} />
          </DashboardCard>
          
          <DashboardCard title="Evolución de Operaciones de Riesgo" height={320}>
            <LineChart
              xAxis={[{ scaleType: 'point', data: evolucionRiesgo.xAxis }]}
              series={evolucionRiesgo.series.map(s => ({ data: s.data, label: s.label, color: s.color, showMark: true }))}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
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
          const d = dashboardsMulti[id] || emptyControlDashboard;
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

    // Gráfico de Barras Combinado: Anomalías por Sucursal
    const etiquetasSucursales = compareBranches.map(id => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      return sucursal ? sucursal.nombre : 'Global';
    });
    
    const serieAnulaciones = compareBranches.map(id => (dashboardsMulti[id]?.kpis?.anulaciones || 0));
    const serieDescuentos = compareBranches.map(id => (dashboardsMulti[id]?.kpis?.descuentosAplicados || 0));

    // Evolución del Riesgo Total (Anulaciones + Descuentos)
    const baseDash = dashboardsMulti[compareBranches[0]] || emptyControlDashboard;
    const xAxisData = baseDash.evolucionRiesgo?.xAxis?.length > 0 ? baseDash.evolucionRiesgo.xAxis : ['1','2','3','4','5','6','7'];
    
    const seriesLineRiesgo = compareBranches.map((id, index) => {
      const d = dashboardsMulti[id] || emptyControlDashboard;
      const nombre = etiquetasSucursales[index];
      // Sumamos las series de Anulaciones y Descuentos para obtener el "Riesgo Total" diario
      const dataAnulaciones = d.evolucionRiesgo?.series?.[0]?.data || [];
      const dataDescuentos = d.evolucionRiesgo?.series?.[1]?.data || [];
      const riesgoTotalDiario = xAxisData.map((_, i) => (dataAnulaciones[i] || 0) + (dataDescuentos[i] || 0));
      
      return { 
        data: riesgoTotalDiario, 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: nombre, 
        showMark: true 
      };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa (Control y Auditoría)</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Operaciones Totales" value={renderApilado((d) => String(d.kpis?.operacionesTotales || 0))} sub="Registradas" tone="mute" />
          <KpiCard eyebrow="Anulaciones" value={renderApilado((d) => String(d.kpis?.anulaciones || 0))} sub="Operaciones anuladas" tone="error" />
          <KpiCard eyebrow="Descuentos Aplicados" value={renderApilado((d) => String(d.kpis?.descuentosAplicados || 0))} sub="Excepciones comerciales" tone="warn" />
          <KpiCard eyebrow="Usuarios Activos" value={renderApilado((d) => String(d.kpis?.usuariosActivos || 0))} sub="Operando" tone="info" />
        </Box>

        {/* Gráficos Macro de Riesgo */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Volumen de Riesgo por Sucursal">
            <BarChart
              xAxis={[{ scaleType: 'band', data: etiquetasSucursales, tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Cant. de Operaciones', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: serieAnulaciones, label: 'Anulaciones', color: '#a93b32' },
                { data: serieDescuentos, label: 'Descuentos', color: '#dfa758' }
              ]}
              margin={{ top: 20, bottom: 50, left: 30, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Evolución del Riesgo Total (Anulaciones + Descuentos)">
            <LineChart
              xAxis={[{ scaleType: 'point', data: xAxisData, label: 'Período', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Total Anomalías', tickLabelStyle: { fontSize: 11 } }]}
              series={seriesLineRiesgo}
              margin={{ top: 20, bottom: 50, left: 30, right: 30 }}
            />
          </DashboardCard>
        </Box>

        {/* Matrices de Auditoría Lado a Lado */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: `repeat(${Math.min(compareBranches.length, 3)}, 1fr)` }, gap: { xs: 2, md: 3 } }}>
          {compareBranches.map((id, index) => {
            const d = dashboardsMulti[id] || emptyControlDashboard;
            const nombre = etiquetasSucursales[index];
            const color = PALETA_COMPARACION[index % PALETA_COMPARACION.length];
            return (
              <DashboardCard key={`heatmap-${id}`} title={`Matriz Empleados: ${nombre}`} height={340}>
                <Box sx={{ position: 'absolute', top: -35, right: 10, width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                <MatrizAuditoria data={d.heatmap || []} />
              </DashboardCard>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Control y Auditoría" meta="Matriz de operaciones y detección de anomalías." />
      
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
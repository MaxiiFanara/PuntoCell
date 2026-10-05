import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stepper, Step, StepLabel, useTheme } from '@mui/material';
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

import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CancelIcon from '@mui/icons-material/Cancel';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyReparacionesDashboard, loadReparacionesDashboard } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales, getOrdenes } from '../../../services/api';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

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
  const theme = useTheme();
  
  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyReparacionesDashboard);
  const [estadosActuales, setEstadosActuales] = useState({
    enEspera: 0, enReparacion: 0, terminado: 0, entregado: 0, anulado: 0
  });
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});
  const [estadosMulti, setEstadosMulti] = useState({});

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error("Error al cargar sucursales:", err));
  }, []);

  // Función inteligente para encender la comparación
  const handleToggleCompare = (checked) => {
    setIsComparing(checked);
    if (checked && compareBranches.length === 0) {
      // Por defecto, compara la sucursal actual (o global) con algo más para que no arranque vacío
      const preseleccion = [branchId];
      if (sucursalesLista.length > 0 && branchId !== '') preseleccion.push('');
      else if (sucursalesLista.length > 0) preseleccion.push(sucursalesLista[0].id);
      setCompareBranches([...new Set(preseleccion)]);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Carga de datos dependiendo de la vista
    if (isComparing) {
      if (compareBranches.length > 0) {
        Promise.all(compareBranches.map(id => loadReparacionesDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyReparacionesDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      loadReparacionesDashboard(seeAll ? null : range, branchId)
        .then((data) => { if (mounted) setDashboard(data); })
        .catch(() => {});
    }
  
    // Carga de Órdenes en vivo
    getOrdenes()
      .then((data) => {
        if (!mounted) return;
        const esEstado = (o, nombre) => o.Estado?.toLowerCase() === nombre.toLowerCase();
        
        if (isComparing) {
          const newEstados = {};
          compareBranches.forEach(id => {
            const filtradas = id ? data.filter(o => String(o.IdSucursal) === String(id)) : data;
            newEstados[id] = {
              enEspera: filtradas.filter(o => esEstado(o, 'en espera')).length,
              enReparacion: filtradas.filter(o => esEstado(o, 'en reparación')).length,
              terminado: filtradas.filter(o => esEstado(o, 'terminado')).length,
              entregado: filtradas.filter(o => esEstado(o, 'entregado')).length
            };
          });
          setEstadosMulti(newEstados);
        } else {
          const filtradas = branchId ? data.filter(o => String(o.IdSucursal) === String(branchId)) : data;
          setEstadosActuales({
            enEspera: filtradas.filter(o => esEstado(o, 'en espera')).length,
            enReparacion: filtradas.filter(o => esEstado(o, 'en reparación')).length,
            terminado: filtradas.filter(o => esEstado(o, 'terminado')).length,
            entregado: filtradas.filter(o => esEstado(o, 'entregado')).length,
            anulado: filtradas.filter(o => esEstado(o, 'anulado')).length,
          });
        }
      })
      .catch(console.error);

    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches, sucursalesLista]);


  // ================= VISTA NORMAL (TU CÓDIGO ORIGINAL INTACTO) =================
  const renderVistaNormal = () => {
    const { kpis, periodo, dispositivos, marcas, dispositivoFalla, pareto, distribucionTiempo, tecnicos, matriz } = dashboard;
    
    const periodoData = periodo.series?.[0]?.data ?? [];
    const periodoXAxis = periodo.xAxis?.length > 0 ? periodo.xAxis : periodoData.map((_, index) => index + 1);
    const periodoSeries = periodoXAxis.length === periodoData.length ? periodoData : periodoXAxis.map((_, index) => periodoData[index] ?? 0);

    const maxRevenue = Math.max(...matriz.map(m => m.z), 100);

    const pasosFlujo = [
      { 
        label: 'En Espera (Recepción)', 
        valor: estadosActuales.enEspera, 
        color: theme.palette.text.secondary,
        icono: <PendingActionsIcon /> 
      },
      { 
        label: 'En Reparación (Taller)', 
        valor: estadosActuales.enReparacion, 
        color: '#12684e', // Verde principal
        icono: <BuildIcon /> 
      },
      { 
        label: 'Terminado (Pendiente Entrega)', 
        valor: estadosActuales.terminado, 
        color: '#dfa758', // Dorado
        icono: <CheckCircleIcon /> 
      },
      { 
        label: 'Entregado (Flujo Completado)', 
        valor: estadosActuales.entregado, 
        color: '#4cbf93', // Verde claro
        icono: <HandshakeIcon /> 
      }
    ];

    return (
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

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              Diagrama de Flujo de Reparaciones (En tiempo real)
            </Typography>
            
            <Box sx={{ width: '100%', overflowX: 'auto', pb: 2 }}>
              <Stepper alternativeLabel sx={{ minWidth: 600 }}>
                {pasosFlujo.map((paso, index) => (
                  <Step key={paso.label} active={true}>
                    <StepLabel 
                      icon={
                        <Box sx={{ 
                          width: 45, height: 45, borderRadius: '50%', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', 
                          bgcolor: `${paso.color}15`, color: paso.color,
                          border: `2px solid ${paso.color}`
                        }}>
                          {paso.icono}
                        </Box>
                      }
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                        {paso.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: paso.color, mt: 0.5 }}>
                        {paso.valor}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Órdenes
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CancelIcon sx={{ color: '#a93b32', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <strong>Desviación de Flujo:</strong> Hay <strong style={{color: '#a93b32'}}>{estadosActuales.anulado} órdenes anuladas</strong> que no lograron completar el ciclo.
              </Typography>
            </Box>
          </Paper>
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
    );
  };


  // ================= VISTA COMPARATIVA =================
  const renderVistaComparacion = () => {
    if (compareBranches.length === 0) return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
        <Typography color="text.secondary">Selecciona al menos una sucursal en el filtro para comenzar la comparación.</Typography>
      </Paper>
    );

    // Helpers para apilar valores en KpiCard
    const renderApilado = (formatearValor) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, mb: 1 }}>
        {compareBranches.map((id, index) => {
          const d = dashboardsMulti[id] || emptyReparacionesDashboard;
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

    // Gráfico de Líneas (Período)
    const baseDash = dashboardsMulti[compareBranches[0]] || emptyReparacionesDashboard;
    const periodoXAxis = baseDash.periodo.xAxis?.length > 0 ? baseDash.periodo.xAxis : (baseDash.periodo.series?.[0]?.data ?? []).map((_, i) => i + 1);
    
    const seriesLine = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const nombre = sucursal ? sucursal.nombre : 'Global';
      return { data: (dashboardsMulti[id] || emptyReparacionesDashboard).periodo.series?.[0]?.data ?? [], color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: nombre, showMark: true };
    });

    // Gráfico de Barras (Dispositivos)
    const allDispositivosSet = new Set();
    compareBranches.forEach(id => {
      (dashboardsMulti[id]?.dispositivos || []).forEach(disp => allDispositivosSet.add(disp.label));
    });
    const allDispositivos = Array.from(allDispositivosSet);
    
    const seriesDisp = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const dMap = new Map((dashboardsMulti[id]?.dispositivos || []).map(item => [item.label, item.value]));
      return { data: allDispositivos.map(lbl => dMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Reparaciones Totales" value={renderApilado((d) => d.kpis.reparacionesTotales)} sub="Equipos procesados" tone="ok" />
          <KpiCard eyebrow="Tiempo Promedio" value={renderApilado((d) => `${d.kpis.tiempoPromedio} Días`)} sub="Desde ingreso a retiro" tone="accent" />
          <KpiCard eyebrow="Tasa de Éxito" value={renderApilado((d) => `${d.kpis.tasaExito}%`)} sub="Sin devoluciones" tone="info" />
          <KpiCard eyebrow="Margen Global" value={renderApilado((d) => `${d.kpis.margenGlobal}%`)} sub="Rentabilidad" tone="warn" />
        </Box>

        {/* Carril de Flujos Apilado Verticalmente */}
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Flujo de Reparaciones Múltiple</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, overflowX: 'auto', pb: 2 }}>
            {compareBranches.map((id, i) => {
              const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
              const nombre = sucursal ? sucursal.nombre : 'Global';
              const est = estadosMulti[id] || { enEspera: 0, enReparacion: 0, terminado: 0, entregado: 0 };
              const color = PALETA_COMPARACION[i % PALETA_COMPARACION.length];
              
              return (
                <Box key={`stepper-${id}`}>
                  <Typography variant="subtitle2" sx={{ color: color, mb: 1, ml: 2, fontWeight: 800 }}>{nombre}</Typography>
                  <Stepper alternativeLabel sx={{ minWidth: 600 }}>
                    <Step active><StepLabel icon={<Box sx={{ width: 35, height: 35, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, color: color, fontWeight: 'bold' }}>{est.enEspera}</Box>}><Typography variant="caption" fontWeight={600}>Recepción</Typography></StepLabel></Step>
                    <Step active><StepLabel icon={<Box sx={{ width: 35, height: 35, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, color: color, fontWeight: 'bold' }}>{est.enReparacion}</Box>}><Typography variant="caption" fontWeight={600}>Taller</Typography></StepLabel></Step>
                    <Step active><StepLabel icon={<Box sx={{ width: 35, height: 35, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, color: color, fontWeight: 'bold' }}>{est.terminado}</Box>}><Typography variant="caption" fontWeight={600}>Terminado</Typography></StepLabel></Step>
                    <Step active><StepLabel icon={<Box sx={{ width: 35, height: 35, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, color: color, fontWeight: 'bold' }}>{est.entregado}</Box>}><Typography variant="caption" fontWeight={600}>Entregado</Typography></StepLabel></Step>
                  </Stepper>
                </Box>
              )
            })}
          </Box>
        </Paper>

        {/* Gráficos Clave */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Volumen de Ingresos">
            <LineChart xAxis={[{ scaleType: 'point', data: periodoXAxis, tickLabelStyle: { fontSize: 11 } }]} series={seriesLine} margin={{ top: 20, bottom: 50, left: 30, right: 30 }} />
          </DashboardCard>
          <DashboardCard title="Demanda por Dispositivos">
            <BarChart xAxis={[{ scaleType: 'band', data: allDispositivos, tickLabelStyle: { fontSize: 11 } }]} series={seriesDisp} margin={{ top: 20, bottom: 50, left: 30, right: 30 }} />
          </DashboardCard>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Reparaciones" meta="Análisis de fallas, tiempos técnicos y rentabilidad del servicio." />
      
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} 
        onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
        isComparing={isComparing} onToggleCompare={handleToggleCompare}
        compareBranches={compareBranches} onChangeCompareBranches={setCompareBranches}
      />

      {isComparing ? renderVistaComparacion() : renderVistaNormal()}
      
    </Box>
  );
}
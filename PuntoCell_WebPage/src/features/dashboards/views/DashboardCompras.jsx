import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Select, MenuItem, FormControl, Autocomplete, TextField } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  ScatterChart,
} from '@mui/x-charts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyComprasDashboard, loadComprasDashboard, getEvolucionPrecioGraph, getDispersionPreciosGraph, getAnalisisStockGraph } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales, getModelos } from '../../../services/api';
import { inventarioService } from '../../../services/inventarioServices';

const PALETA_COMPARACION = ['#12684e', '#dfa758', '#a93b32', '#4cbf93'];

const DashboardCard = ({ title, children, height = 340, rightAction = null }) => (
  <Paper 
    sx={{ 
      p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column',
      borderRadius: '16px', boxShadow: (t) => t.vars.palette.pc.lift, 
      height: '100%', width: '100%'
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {rightAction && <Box>{rightAction}</Box>}
    </Box>
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

export default function DashboardCompras() {
  // ================= ESTADOS VISTA NORMAL =================
  const [dashboard, setDashboard] = useState(emptyComprasDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  
  const [graficosProducto, setGraficosProducto] = useState({
    precioProducto: emptyComprasDashboard.precioProducto,
    dispersionPrecios: emptyComprasDashboard.dispersionPrecios,
    analisisStock: []
  });
  
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);
  const [modelosBuscador, setModelosBuscador] = useState([]);

  // ================= ESTADOS VISTA COMPARATIVA =================
  const [isComparing, setIsComparing] = useState(false);
  const [compareBranches, setCompareBranches] = useState([]);
  const [dashboardsMulti, setDashboardsMulti] = useState({});

  useEffect(() => {
    getSucursales().then((data) => setSucursalesLista(data)).catch((err) => console.error("Error al cargar sucursales:", err));
    getModelos().then((data) => setModelosBuscador(data)).catch((e) => console.error("Error cargando modelos", e));
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
        Promise.all(compareBranches.map(id => loadComprasDashboard(seeAll ? null : range, id)))
          .then(results => {
            if (!mounted) return;
            const newDash = {};
            compareBranches.forEach((id, index) => { newDash[id] = results[index] || emptyComprasDashboard; });
            setDashboardsMulti(newDash);
          });
      }
    } else {
      loadComprasDashboard(seeAll ? null : range, branchId)
        .then((data) => {
          if (mounted) {
            setDashboard(data);
            setGraficosProducto({
              precioProducto: data.precioProducto,
              dispersionPrecios: data.dispersionPrecios,
              analisisStock: data.inventario
            });
          }
        }).catch(() => {});
    }
    
    return () => { mounted = false; };
  }, [range, seeAll, branchId, isComparing, compareBranches]);

  const handleProductChange = async (event, newValue) => {
    const selectedId = newValue ? String(newValue.id || newValue.Id) : '';
    const selectedName = newValue ? (newValue.nombre || newValue.Nombre || '') : '';
    
    setDashboard(prev => ({ ...prev, productoSeleccionadoId: selectedId, productoSeleccionadoNombre: selectedName }));

    if (!selectedId) return;

    try {
      const [nuevoEvolucion, nuevoDispersion] = await Promise.all([
        getEvolucionPrecioGraph(seeAll ? null : range, selectedId, branchId),
        getDispersionPreciosGraph(seeAll ? null : range, selectedId, branchId),
        getAnalisisStockGraph(selectedId, branchId, selectedName)
      ]);
      
      setGraficosProducto({ precioProducto: nuevoEvolucion, dispersionPrecios: nuevoDispersion });
    } catch (e) { console.error("Error cargando gráficos del modelo", e); }
  };


  // ================= VISTA NORMAL (INTACTA) =================
  const renderVistaNormal = () => {
    const { kpis, evolucionCosto, proveedores, inventario, productoSeleccionadoId } = dashboard;
    const { precioProducto, dispersionPrecios } = graficosProducto;

    const modeloSeleccionadoObj = modelosBuscador.find(
      m => String(m.id || m.Id) === String(productoSeleccionadoId)
    ) || null;

    const renderProductoSelector = () => (
      <FormControl size="small" sx={{ minWidth: 250 }}>
        <Autocomplete
          size="small"
          options={modelosBuscador}
          getOptionLabel={(option) => option.nombre || option.Nombre || ''}
          isOptionEqualToValue={(option, value) => String(option.id || option.Id) === String(value.id || value.Id)}
          value={modeloSeleccionadoObj}
          onChange={handleProductChange}
          noOptionsText="No se encontraron modelos"
          renderOption={(props, option) => (
            <li {...props} key={option.id || option.Id}>{option.nombre || option.Nombre}</li>
          )}
          renderInput={(params) => <TextField {...params} placeholder="Buscar Modelo..." />}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
        />
      </FormControl>
    );

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Gasto Mensual" value={`U$S ${kpis.gastoMensual.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="+12% vs mes anterior" tone="warn" />
          <KpiCard eyebrow="Proveedores Activos" value={String(kpis.proveedoresActivos)} sub="Con compras en los últimos 30 días" tone="mute" />
          <KpiCard eyebrow="Alertas de Stock" value={String(kpis.alertasStock)} sub="Por debajo del punto de reposición" tone="error" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Costos de Compra">
            <LineChart
              xAxis={[{ 
                data: evolucionCosto.xAxis.length > 0 ? evolucionCosto.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], 
                valueFormatter: (v) => evolucionCosto.xAxis[v-1] || '',
                label: 'Período (Fechas)',
                width: 'auto', tickLabelStyle: { fontSize: 11 }
              }]}
              yAxis={[{ label: 'Gasto Total ($)', width: 100, tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: evolucionCosto.series[0].data, color: '#dfa758', showMark: true, curve: 'linear', label: 'Gasto total' }]}
              margin={{ top: 20, bottom: 50, left: 40, right: 40 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Volumen por Proveedor">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: proveedores.map(p => p.nombre), label: 'Proveedores', width: 'auto', tickLabelStyle: { fontSize: 11 }, colorMap: {type: 'ordinal',colors: ['#12684e', '#dfa758', '#a93b32', '#4cbf93', '#a39d93', '#c08d42']} }]}
              xAxis={[{ label: 'Monto Total ($)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[{ data: proveedores.map(p => p.monto)}]}
              margin={{ top: 10, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Evolución del Precio" rightAction={renderProductoSelector()}>
            <LineChart
              xAxis={[{ 
                data: precioProducto.xAxis.length > 0 ? precioProducto.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], 
                valueFormatter: (v) => precioProducto.xAxis[v-1] || '',
                label: 'Período (Meses)',
                width: 'auto', tickLabelStyle: { fontSize: 11 }
              }]}
              yAxis={[{ label: 'Precio Unitario (U$S)', width: 'auto', tickLabelStyle: { fontSize: 11 }, valueFormatter: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }]}
              series={[{ data: precioProducto.series[0].data, color: '#a93b32', showMark: true, label: 'Precio Unitario (U$S)' }]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Dispersión de Precios" rightAction={renderProductoSelector()}>
             <ScatterChart
                xAxis={[{ 
                  min: 0, max: 5, tickInterval: [1, 2, 3, 4], 
                  valueFormatter: (v) => ['N/A', 'Prov 1', 'Prov 2', 'Prov 3', 'Prov 4'][v] || '',
                  label: 'Proveedores', width: 'auto', tickLabelStyle: { fontSize: 11 }
                }]}
                yAxis={[{ label: 'Precio Cotizado (U$S)', width: 'auto', tickLabelStyle: { fontSize: 11 }, valueFormatter: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }]}
                series={[{ data: dispersionPrecios, color: '#a39d93', markerSize: 7 }]}
                margin={{ top: 20, bottom: 30, left: 20, right: 20 }}
              />
          </DashboardCard>

          <DashboardCard title="Análisis de Stock (Actual vs Reposición vs Seguridad)" rightAction={renderProductoSelector()}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: inventario.map(i => i.producto), label: 'Productos', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Cantidad (Unidades)', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { data: inventario.map(i => i.stockActual), label: 'Stock Actual', color: '#12684e' },
                { data: inventario.map(i => i.puntoReposicion), label: 'Punto Reposición', color: '#dfa758' },
                { data: inventario.map(i => i.stockSeguridad), label: 'Stock Seguridad', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 50, left: 30, right: 20 }}
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
          const d = dashboardsMulti[id] || emptyComprasDashboard;
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

    // 1. Gráfico de Líneas (Evolución de Costos)
    const baseDash = dashboardsMulti[compareBranches[0]] || emptyComprasDashboard;
    const xAxisData = baseDash.evolucionCosto?.xAxis?.length > 0 ? baseDash.evolucionCosto.xAxis.map((_, i) => i + 1) : [1,2,3,4,5,6,7];
    const seriesCostos = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const d = dashboardsMulti[id] || emptyComprasDashboard;
      return { 
        data: d.evolucionCosto?.series?.[0]?.data ?? [], 
        color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], 
        label: sucursal ? sucursal.nombre : 'Global', 
        showMark: true 
      };
    });

    // 2. Gráfico de Barras Horizontales (Volumen por Proveedor)
    const allProvSet = new Set();
    compareBranches.forEach(id => { (dashboardsMulti[id]?.proveedores || []).forEach(p => allProvSet.add(p.nombre)); });
    const allProveedores = Array.from(allProvSet);
    const seriesProv = compareBranches.map((id, index) => {
      const sucursal = sucursalesLista.find(s => String(s.id) === String(id));
      const pMap = new Map((dashboardsMulti[id]?.proveedores || []).map(item => [item.nombre, item.monto]));
      return { data: allProveedores.map(lbl => pMap.get(lbl) || 0), color: PALETA_COMPARACION[index % PALETA_COMPARACION.length], label: sucursal ? sucursal.nombre : 'Global' };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Comparativa Activa (Métricas Macro)</Typography>
        </Box>

        {/* KPIs Apilados */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Gasto Mensual" value={renderApilado((d) => `U$S ${d.kpis?.gastoMensual?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`)} sub="Gasto total" tone="warn" />
          <KpiCard eyebrow="Proveedores Activos" value={renderApilado((d) => String(d.kpis?.proveedoresActivos || 0))} sub="Con compras recientes" tone="mute" />
          <KpiCard eyebrow="Alertas de Stock" value={renderApilado((d) => String(d.kpis?.alertasStock || 0))} sub="Por debajo del punto de reposición" tone="error" />
        </Box>

        {/* Gráfico 1: Proveedores (Compartido / Ancho medio) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Volumen de Compras por Proveedor">
            {allProveedores.length > 0 ? (
              <BarChart 
                layout="horizontal"
                yAxis={[{ scaleType: 'band', data: allProveedores, label: 'Proveedores', width: 'auto', tickLabelStyle: { fontSize: 11 } }]}
                xAxis={[{ label: 'Monto Total ($)', tickLabelStyle: { fontSize: 11 } }]}
                series={seriesProv} 
                margin={{ top: 10, bottom: 50, left: 20, right: 30 }} 
              />
            ) : (
              <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: 'text.disabled' }}>No hay datos de proveedores</Box>
            )}
          </DashboardCard>

           {/* <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 4, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Los análisis específicos por producto (Dispersión de precios y Análisis de Stock) están disponibles en la <strong>vista individual</strong> de cada sucursal para mayor detalle.
            </Typography>
          </Box> */}
        </Box>

        {/* Gráfico 2: Evolución (Abajo, ancho completo) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Costos de Compra">
            <LineChart 
              xAxis={[{ data: xAxisData, valueFormatter: (v) => baseDash.evolucionCosto?.xAxis?.[v-1] || '', label: 'Período', tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ label: 'Gasto Total ($)', width: 100, tickLabelStyle: { fontSize: 11 } }]}
              series={seriesCostos} 
              margin={{ top: 20, bottom: 50, left: 40, right: 40 }} 
            />
          </DashboardCard>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Compras" meta="Análisis de costos, proveedores e inventario inteligente." />
      
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
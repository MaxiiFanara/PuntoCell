import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Select, MenuItem, FormControl } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  ScatterChart,
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import { emptyComprasDashboard, loadComprasDashboard, getEvolucionPrecioGraph, getDispersionPreciosGraph } from '../data/dashboardData';
import DashboardRangeFilter from '../components/DashboardRangeFilter';
import { useDashboardRange } from '../hooks/useDashboardRange';
import { getSucursales } from '../../../services/api';

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
  const [dashboard, setDashboard] = useState(emptyComprasDashboard);
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [branchId, setBranchId] = useState('');
  
  const [graficosProducto, setGraficosProducto] = useState({
    precioProducto: emptyComprasDashboard.precioProducto,
    dispersionPrecios: emptyComprasDashboard.dispersionPrecios
  });
  
  const { range, seeAll, updateFrom, updateTo, toggleSeeAll } = useDashboardRange(30);

  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error("Error al cargar sucursales:", err));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadComprasDashboard(seeAll ? null : range, branchId)
      .then((data) => {
        if (mounted) {
          setDashboard(data);
          setGraficosProducto({
            precioProducto: data.precioProducto,
            dispersionPrecios: data.dispersionPrecios
          });
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [range, seeAll, branchId]);

  const handleProductChange = async (event) => {
    const selectedId = String(event.target.value);
    const selectedName = dashboard.listaProductos.find(p => String(p.id) === selectedId)?.nombre || '';
    
    setDashboard(prev => ({
      ...prev,
      productoSeleccionadoId: selectedId,
      productoSeleccionadoNombre: selectedName
    }));

    try {
      const [nuevoEvolucion, nuevoDispersion] = await Promise.all([
        getEvolucionPrecioGraph(seeAll ? null : range, selectedId, branchId),
        getDispersionPreciosGraph(seeAll ? null : range, selectedId, branchId)
      ]);
      
      setGraficosProducto({
        precioProducto: nuevoEvolucion,
        dispersionPrecios: nuevoDispersion
      });
    } catch (e) {
      console.error("Error cargando gráficos del producto", e);
    }
  };

  const { kpis, evolucionCosto, proveedores, inventario, listaProductos, productoSeleccionadoId } = dashboard;
  const { precioProducto, dispersionPrecios } = graficosProducto;

  const ProductoSelector = (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={productoSeleccionadoId ? String(productoSeleccionadoId) : ''}
        onChange={handleProductChange}
        displayEmpty
        renderValue={(selected) => {
          const prod = listaProductos.find(p => String(p.id) === String(selected));
          return prod ? prod.nombre : 'Seleccionar Producto...';
        }}
        sx={{ fontSize: '0.85rem' }}
      >
        {listaProductos.map((p) => (
          <MenuItem key={p.id} value={String(p.id)} sx={{ fontSize: '0.85rem' }}>
            {p.nombre}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader eyebrow="Dashboard" title="Módulo de Compras" meta="Análisis de costos, proveedores e inventario inteligente." />
      <DashboardRangeFilter 
        range={range} seeAll={seeAll} onChangeFrom={updateFrom} onChangeTo={updateTo} onToggleSeeAll={toggleSeeAll} 
        sucursales={sucursalesLista} branchId={branchId} onChangeBranch={setBranchId}
      />

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
              series={[{ 
                data: evolucionCosto.series[0].data,
                color: '#dfa758', showMark: true, curve: 'linear', label: 'Gasto total'
              }]}
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
              series={[
                { data: proveedores.map(p => p.monto)}
              ]}
              margin={{ top: 10, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Evolución del Precio" rightAction={ProductoSelector}>
            <LineChart
              xAxis={[{ 
                data: precioProducto.xAxis.length > 0 ? precioProducto.xAxis.map((_, index) => index + 1) : [1, 2, 3, 4, 5, 6, 7], 
                valueFormatter: (v) => precioProducto.xAxis[v-1] || '',
                label: 'Período (Meses)',
                width: 'auto', tickLabelStyle: { fontSize: 11 }
              }]}
              yAxis={[{ label: 'Precio Unitario (U$S)', width: 'auto', tickLabelStyle: { fontSize: 11 }, valueFormatter: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }]}
              series={[{ 
                data: precioProducto.series[0].data,
                color: '#a93b32', showMark: true, label: 'Precio Unitario (U$S)'
              }]}
              margin={{ top: 20, bottom: 50, left: 20, right: 20 }}
            />
          </DashboardCard>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Dispersión de Precios" rightAction={ProductoSelector}>
             <ScatterChart
                xAxis={[{ 
                  min: 0, max: 5, 
                  tickInterval: [1, 2, 3, 4], 
                  valueFormatter: (v) => ['N/A', 'Prov 1', 'Prov 2', 'Prov 3', 'Prov 4'][v] || '',
                  label: 'Proveedores (Anonimizados)',
                  width: 'auto', tickLabelStyle: { fontSize: 11 }
                }]}
                yAxis={[{ label: 'Precio Cotizado (U$S)', width: 'auto', tickLabelStyle: { fontSize: 11 }, valueFormatter: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }]}
                series={[{ data: dispersionPrecios, color: '#a39d93', markerSize: 7 }]}
                margin={{ top: 20, bottom: 30, left: 20, right: 20 }}
              />
          </DashboardCard>

          <DashboardCard title="Análisis de Stock (Actual vs Reposición vs Seguridad)">
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
    </Box>
  );
}
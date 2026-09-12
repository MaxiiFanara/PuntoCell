import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  ScatterChart,
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';

// ==========================================
// 1. DATOS DE PRUEBA (MOCKS)
// ==========================================

// 1. Evolución de costo de compra
const mockEvolucionCosto = { 
  xAxis: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], 
  series: [{ data: [45, 52, 48, 61, 59, 68, 75], label: 'Costo Total (Miles $)' }] 
};

// 4. Evolución del precio de 1 producto (ej: iPhone 15)
const mockPrecioProducto = { 
  xAxis: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], 
  series: [{ data: [800, 820, 850, 910, 940, 950, 965], label: 'Precio Compra (U$S)' }] 
};

// 2 y 3. Compras y Ranking por Proveedor
const mockProveedores = [
  { nombre: 'Apple Inc.', monto: 120, cumplimiento: 98 },
  { nombre: 'Dist. Central', monto: 85, cumplimiento: 85 },
  { nombre: 'Tech Import', monto: 60, cumplimiento: 92 },
  { nombre: 'Samsung AR', monto: 45, cumplimiento: 95 },
  { nombre: 'Accesorios Sur', monto: 20, cumplimiento: 70 },
];

// 5. Variación precio proveedor (Dispersión simulando Box Plot)
// Muestra a qué precio nos vendió cada proveedor el mismo producto a lo largo del año
const mockDispersionPrecios = [
  { x: 1, y: 950, id: 'p1' }, { x: 1, y: 940, id: 'p2' }, { x: 1, y: 960, id: 'p3' }, // Proveedor 1 (Consistente)
  { x: 2, y: 880, id: 'p4' }, { x: 2, y: 990, id: 'p5' }, { x: 2, y: 920, id: 'p6' }, // Proveedor 2 (Volátil)
  { x: 3, y: 1050, id: 'p7'}, { x: 3, y: 1020, id: 'p8'}, // Proveedor 3 (Caro)
  { x: 4, y: 850, id: 'p9' }, { x: 4, y: 870, id: 'p10'}, // Proveedor 4 (Barato)
];

// 6. ABC de Compras
const mockABC = [
  { id: 0, value: 70, label: 'Clase A (Críticos)', color: '#a93b32' },
  { id: 1, value: 20, label: 'Clase B (Medios)', color: '#dfa758' },
  { id: 2, value: 10, label: 'Clase C (Bajos)', color: '#4cbf93' },
];

// 7 y 8. Punto de reposición y Stock de Seguridad
const mockInventario = [
  { producto: 'iPhone 15', stockActual: 45, puntoReposicion: 20, stockSeguridad: 10 },
  { producto: 'Funda S24', stockActual: 15, puntoReposicion: 30, stockSeguridad: 15 }, // Quiebre inminente
  { producto: 'AirPods Pro', stockActual: 22, puntoReposicion: 20, stockSeguridad: 10 },
  { producto: 'Cargador 20W', stockActual: 80, puntoReposicion: 40, stockSeguridad: 20 },
];

// 9. EOQ (Economic Order Quantity) - Curva de Costos
// Eje X: Cantidad a ordenar. Lineas: Costo de Mantenimiento, Costo de Pedido, Costo Total
const mockEOQ = {
  cantidades: [50, 100, 150, 200, 250, 300, 350, 400],
  costoMantenimiento: [100, 200, 300, 400, 500, 600, 700, 800],
  costoPedido: [800, 400, 266, 200, 160, 133, 114, 100],
  costoTotal: [900, 600, 566, 600, 660, 733, 814, 900], // El punto más bajo (mínimo) es el EOQ (aprox 150-200 uds)
};

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO (100% WIDTH)
// ==========================================
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

// ==========================================
// 3. VISTA PRINCIPAL
// ==========================================
export default function DashboardCompras() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Compras" 
        meta="Análisis de costos, proveedores e inventario inteligente." 
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Gasto Mensual" value="U$S 75,000" sub="+12% vs mes anterior" tone="warn" />
          <KpiCard eyebrow="Proveedores Activos" value="24" sub="Con compras en los últimos 30 días" tone="mute" />
          <KpiCard eyebrow="Cumplimiento Promedio" value="89%" sub="Entregas a tiempo" tone="ok" />
          <KpiCard eyebrow="Alertas de Stock" value="3" sub="Por debajo del punto de reposición" tone="error" />
        </Box>

        {/* FILA 2: Evolución de Costos (1) y ABC de Compras (6) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Costos de Compra">
            <LineChart
              xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => mockEvolucionCosto.xAxis[v-1] }]}
              series={[{ 
                data: mockEvolucionCosto.series[0].data,
                area: true, color: '#dfa758', showMark: true, curve: 'linear', label: 'Gasto total'
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Análisis ABC de Compras">
            <PieChart
              series={[{
                data: mockABC,
                innerRadius: '40%', outerRadius: '90%', paddingAngle: 2, cornerRadius: 4,
              }]}
              margin={{ top: 10, bottom: 50, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Ranking de Proveedores (2 y 3) y Evolución de 1 Producto (4) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ranking de Proveedores (Volumen y Cumplimiento)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: mockProveedores.map(p => p.nombre) }]}
              series={[
                { data: mockProveedores.map(p => p.monto), label: 'Monto (Miles $)', color: '#dfa758' },
                { data: mockProveedores.map(p => p.cumplimiento), label: 'Cumplimiento (%)', color: '#12684e' }
              ]}
              margin={{ top: 10, bottom: 25, left: 100, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Evolución de Precio: iPhone 15">
            <LineChart
              xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => mockPrecioProducto.xAxis[v-1] }]}
              series={[{ 
                data: mockPrecioProducto.series[0].data,
                color: '#a93b32', showMark: true, label: 'Precio Unitario (U$S)'
              }]}
              margin={{ top: 20, bottom: 25, left: 50, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Rango de Precios (5) y Gestión de Inventario (7 y 8) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Dispersión de Precios por Proveedor">
             {/* Simulación de BoxPlot: Eje X = Proveedor, Eje Y = Precios Ofrecidos */}
             <ScatterChart
                xAxis={[{ 
                  min: 0, max: 5, 
                  tickInterval: [1, 2, 3, 4], 
                  valueFormatter: (v) => ['N/A', 'Prov 1', 'Prov 2', 'Prov 3', 'Prov 4'][v] || ''
                }]}
                yAxis={[{ label: 'Precio Cotizado ($)', min: 800 }]}
                series={[{ data: mockDispersionPrecios, color: '#a39d93', markerSize: 7 }]}
                margin={{ top: 20, bottom: 25, left: 60, right: 20 }}
              />
          </DashboardCard>

          <DashboardCard title="Análisis de Stock (Actual vs Reposición vs Seguridad)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockInventario.map(i => i.producto) }]}
              series={[
                { data: mockInventario.map(i => i.stockActual), label: 'Stock Actual', color: '#12684e' },
                { data: mockInventario.map(i => i.puntoReposicion), label: 'Punto Reposición', color: '#dfa758' },
                { data: mockInventario.map(i => i.stockSeguridad), label: 'Stock Seguridad', color: '#a93b32' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Modelo EOQ (9) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Análisis EOQ (Cantidad Económica de Pedido)" height={380}>
            <LineChart
              xAxis={[{ 
                data: mockEOQ.cantidades, 
                label: 'Cantidad a ordenar (Unidades)' 
              }]}
              series={[
                { data: mockEOQ.costoMantenimiento, label: 'Costo Mantenimiento', color: '#dfa758', showMark: false },
                { data: mockEOQ.costoPedido, label: 'Costo de Pedido', color: '#4cbf93', showMark: false },
                { data: mockEOQ.costoTotal, label: 'Costo Total (Mínimo = EOQ)', color: '#a93b32', showMark: true }
              ]}
              margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
            />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
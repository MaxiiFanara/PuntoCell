import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  ScatterChart,
  ChartsContainer,
  BarPlot,
  LinePlot,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip,
  ChartsGrid
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';

// ==========================================
// 1. DATOS DE PRUEBA (MOCKS)
// ==========================================
const mockEvolucion = { xAxis: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], series: [{ data: [12, 15, 14, 18, 22, 21, 25], label: 'Ventas (Millones $)' }] };
const mockFormaPago = [{ id: 0, value: 40, label: 'Crédito', color: '#12684e' }, { id: 1, value: 30, label: 'Transf.', color: '#4cbf93' }, { id: 2, value: 20, label: 'Efectivo', color: '#dfa758' }, { id: 3, value: 10, label: 'Débito', color: '#a39d93' }];
const mockCategorias = [{ label: 'iPhone', value: 25 }, { label: 'Accesorios', value: 18 }, { label: 'Consolas', value: 12 }, { label: 'Componentes', value: 8 }, { label: 'Periféricos', value: 6 }];
const mockSucursales = [{ nombre: 'Centro', facturacion: 50, margen: 30 }, { nombre: 'Cerro', facturacion: 40, margen: 35 }, { nombre: 'Nva Cba', facturacion: 60, margen: 28 }];
const mockEmpleados = [{ nombre: 'Juan P.', ventas: 120, ticket: 30 }, { nombre: 'Ana M.', ventas: 150, ticket: 35 }, { nombre: 'Pedro G.', ventas: 90, ticket: 28 }, { nombre: 'Sofía L.', ventas: 110, ticket: 32 }];
const mockPareto = { productos: ['Prod A', 'Prod B', 'Prod C', 'Prod D', 'Prod E', 'Otros'], ventasAbsolutas: [1000, 600, 300, 100, 50, 20], porcentajeAcumulado: [48.3, 77.2, 91.7, 96.6, 99.0, 100.0] };
const mockElasticidad = [{ x: 100, y: 500, id: 'p1' }, { x: 120, y: 420, id: 'p2' }, { x: 150, y: 300, id: 'p3' }, { x: 180, y: 210, id: 'p4' }, { x: 200, y: 150, id: 'p5' }, { x: 250, y: 80, id: 'p6' }];

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO (100% WIDTH)
// ==========================================
const DashboardCard = ({ title, children, height = 340 }) => (
  <Paper 
    sx={{ 
      p: { xs: 2, md: 3 }, 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '16px',
      boxShadow: (t) => t.vars.palette.pc.lift, 
      height: '100%',
      width: '100%' // Asegura que la tarjeta tome todo el espacio asignado
    }}
  >
    <Typography 
      variant="h6" 
      sx={{ 
        mb: 2, 
        fontWeight: 700, 
        fontSize: '1.05rem', 
        letterSpacing: '-0.01em' 
      }}
    >
      {title}
    </Typography>
    
    {/* EL TRUCO ESTÁ ACÁ: Forzamos un contenedor con altura fija y posicionamiento absoluto adentro. 
        Esto evita que los gráficos colapsen la grilla. */}
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </Box>
    </Box>
  </Paper>
);

// ==========================================
// 3. VISTA PRINCIPAL (CON CSS GRID PURO)
// ==========================================
export default function DashboardVentas() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Ventas" 
        meta="Análisis de rendimiento comercial y proyecciones." 
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs (Siempre ocupan 100% del ancho) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Facturación Total" value="U$S 127,000" sub="+14% vs mes anterior" tone="ok" />
          <KpiCard eyebrow="Ticket Promedio" value="U$S 345" sub="Mediana: U$S 290" tone="accent" />
          <KpiCard eyebrow="Operaciones" value="368" sub="Ventas cerradas" tone="mute" />
          <KpiCard eyebrow="Margen Promedio" value="32.4%" sub="General" tone="warn" />
        </Box>

        {/* FILA 2: Evolución y Forma de Pago (Proporción 65% - 35%) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Evolución de Ventas">
            <LineChart
              xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => mockEvolucion.xAxis[v-1] }]}
              series={[{ 
                data: mockEvolucion.series[0].data,
                area: true,
                color: '#12684e',
                showMark: true,
                curve: 'linear', // Hace la línea más suave
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas por Forma de Pago">
            <PieChart
              series={[{
                data: mockFormaPago,
                innerRadius: '50%',
                outerRadius: '90%',
                paddingAngle: 3,
                cornerRadius: 6,
              }]}
              margin={{ top: 10, bottom: 50, left: 10, right: 10 }}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Categorías y Sucursales (Mitad y Mitad) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Ventas por Categoría (Millones $)">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: mockCategorias.map(c => c.label) }]}
              series={[{ data: mockCategorias.map(c => c.value), color: '#12684e' }]}
              margin={{ top: 10, bottom: 25, left: 80, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Ventas vs Margen por Sucursal">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockSucursales.map(s => s.nombre) }]}
              series={[
                { data: mockSucursales.map(s => s.facturacion), label: 'Facturación', color: '#4cbf93' },
                { data: mockSucursales.map(s => s.margen), label: 'Margen', color: '#dfa758' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Pareto y Empleados (Proporción 60% - 40%) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Pareto de Productos">
            <ChartsContainer
              series={[
                { type: 'bar', data: mockPareto.ventasAbsolutas, yAxisKey: 'leftAxis', color: '#12684e', label: 'Volumen' },
                { type: 'line', data: mockPareto.porcentajeAcumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acum.' }
              ]}
              xAxis={[{ data: mockPareto.productos, scaleType: 'band', id: 'x-axis' }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear' },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105 }
              ]}
              margin={{ top: 20, bottom: 25, left: 50, right: 50 }}
            >
              <ChartsGrid horizontal />
              <BarPlot />
              <LinePlot />
              <ChartsXAxis axisId="x-axis" />
              <ChartsYAxis axisId="leftAxis" position="left" />
              <ChartsYAxis axisId="rightAxis" position="right" />
              <ChartsTooltip />
            </ChartsContainer>
          </DashboardCard>
          
          <DashboardCard title="Performance por Vendedor">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockEmpleados.map(e => e.nombre) }]}
              series={[
                { data: mockEmpleados.map(e => e.ventas), label: 'Ventas (Cant)', color: '#12684e' },
                { data: mockEmpleados.map(e => e.ticket), label: 'Ticket ($)', color: '#a39d93' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Elasticidad */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Elasticidad Precio vs Demanda" height={380}>
             <ScatterChart
                xAxis={[{ label: 'Precio ($)', min: 50 }]}
                yAxis={[{ label: 'Demanda (Unidades)' }]}
                series={[
                  {
                    data: mockElasticidad,
                    color: '#dfa758',
                    markerSize: 8,
                  },
                ]}
                margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
              />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
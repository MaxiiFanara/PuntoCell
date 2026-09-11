import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
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

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';

// ==========================================
// 1. DATOS DE PRUEBA (MOCKS)
// ==========================================

// 1. Reparaciones por periodo
const mockPeriodo = { 
  xAxis: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], 
  series: [{ data: [120, 135, 110, 160, 190, 185, 210], label: 'Equipos Reparados' }] 
};

// 2. Reparaciones por dispositivos
const mockDispositivos = [
  { label: 'Celulares', value: 350 }, { label: 'Notebooks', value: 120 },
  { label: 'PC', value: 80 }, { label: 'Consolas', value: 45 }, { label: 'Tablets', value: 25 },
];

// 3. Reparaciones por marcas
const mockMarcas = [
  { label: 'Samsung', value: 180 }, { label: 'Apple', value: 150 }, 
  { label: 'Motorola', value: 110 }, { label: 'Xiaomi', value: 90 }, { label: 'Lenovo', value: 60 }
];

// 4. Dispositivo x Reparacion (Apilado / Stacked)
const mockDispositivoFalla = [
  { dispositivo: 'Celulares', pantalla: 150, bateria: 100, pinCarga: 80, software: 20 },
  { dispositivo: 'Notebooks', pantalla: 20, bateria: 40, pinCarga: 30, software: 30 },
  { dispositivo: 'Tablets', pantalla: 15, bateria: 5, pinCarga: 3, software: 2 },
];

// 5. Pareto de Fallas
const mockPareto = { 
  fallas: ['Pantalla', 'Batería', 'Pin Carga', 'Software', 'Cámara', 'Otros'], 
  absolutas: [185, 145, 113, 52, 15, 10], 
  acumulado: [35.5, 63.4, 85.1, 95.1, 98.0, 100.0] 
};

// 7. Distribucion del tiempo de reparacion (Histograma)
const mockDistribucionTiempo = {
  categorias: ['En el día', '24 a 48 hs', '3 a 5 días', '1 a 2 semanas', '+2 semanas'],
  frecuencia: [150, 220, 95, 45, 10]
};

// 8. Rentabilidad por reparacion / Performance Técnico
const mockTecnicos = [
  { nombre: 'Martín', exitosas: 120, devueltas: 5, tiempoPromedio: 1.5, margenGen: 45 },
  { nombre: 'Carlos', exitosas: 95, devueltas: 2, tiempoPromedio: 2.2, margenGen: 50 },
  { nombre: 'Lucía', exitosas: 140, devueltas: 12, tiempoPromedio: 1.8, margenGen: 38 },
];

// 9. Matriz Reparacion x Rentabilidad (Bubble Chart)
// X: Cantidad (Demanda) | Y: Margen (%) | Z: Facturación (Tamaño)
const mockMatriz = [
  { id: '1', servicio: 'Cambio Pantalla iPhone', x: 80, y: 35, z: 15000, color: '#4cbf93' }, // Alta demanda, Margen OK
  { id: '2', servicio: 'Micro-soldadura Placa', x: 15, y: 75, z: 8000, color: '#12684e' },   // Baja demanda, Alto margen (Estrella)
  { id: '3', servicio: 'Limpieza / Mantenimiento', x: 120, y: 15, z: 5000, color: '#dfa758' }, // Mucha demanda, Bajo margen
  { id: '4', servicio: 'Cambio Batería Genérica', x: 90, y: 25, z: 7000, color: '#a39d93' },  
  { id: '5', servicio: 'Reballing GPU', x: 5, y: 80, z: 4000, color: '#a93b32' },            // Muy baja demanda, altísimo margen
];


// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO
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
export default function DashboardReparaciones() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10 }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Reparaciones" 
        meta="Análisis de fallas, tiempos técnicos y rentabilidad del servicio." 
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs (Incluye KPI 6: Tiempo Promedio) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Reparaciones Totales" value="620" sub="Equipos procesados" tone="ok" />
          <KpiCard eyebrow="Tiempo Promedio (MRT)" value="2.7 Días" sub="Desde ingreso a retiro" tone="accent" />
          <KpiCard eyebrow="Tasa de Éxito" value="94.5%" sub="Sin devoluciones por garantía" tone="info" />
          <KpiCard eyebrow="Margen Global" value="42%" sub="Rentabilidad operativa" tone="warn" />
        </Box>

        {/* FILA 2: Evolución (1) y Distribución del Tiempo (7) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Período">
            <LineChart
              xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7], valueFormatter: (v) => mockPeriodo.xAxis[v-1] }]}
              series={[{ 
                data: mockPeriodo.series[0].data,
                area: true, color: '#12684e', showMark: true, curve: 'linear', label: 'Ingresos Técnicos'
              }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Distribución de Tiempos (Histograma)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockDistribucionTiempo.categorias }]}
              series={[{ data: mockDistribucionTiempo.frecuencia, color: '#a39d93', label: 'Cant. Reparaciones' }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 3: Dispositivos (2) y Marcas (3) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Reparaciones por Dispositivo">
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: 'band', data: mockDispositivos.map(d => d.label) }]}
              series={[{ data: mockDispositivos.map(d => d.value), color: '#12684e' }]}
              margin={{ top: 10, bottom: 25, left: 90, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Reparaciones por Marca">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockMarcas.map(m => m.label) }]}
              series={[{ data: mockMarcas.map(m => m.value), color: '#4cbf93' }]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 4: Pareto de Fallas (5) y Dispositivo x Reparacion (4) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Pareto de Fallas">
            <ChartsContainer
              series={[
                { type: 'bar', data: mockPareto.absolutas, yAxisKey: 'leftAxis', color: '#12684e', label: 'Cant. Fallas' },
                { type: 'line', data: mockPareto.acumulado, yAxisKey: 'rightAxis', color: '#dfa758', label: '% Acumulado' }
              ]}
              xAxis={[{ data: mockPareto.fallas, scaleType: 'band', id: 'x-axis' }]}
              yAxis={[
                { id: 'leftAxis', scaleType: 'linear' },
                { id: 'rightAxis', scaleType: 'linear', min: 0, max: 105 }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 40 }}
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

          <DashboardCard title="Cruce: Dispositivo vs Tipo de Reparación">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockDispositivoFalla.map(d => d.dispositivo) }]}
              series={[
                { data: mockDispositivoFalla.map(d => d.pantalla), label: 'Pantalla', color: '#12684e', stack: 'total' },
                { data: mockDispositivoFalla.map(d => d.bateria), label: 'Batería', color: '#4cbf93', stack: 'total' },
                { data: mockDispositivoFalla.map(d => d.pinCarga), label: 'Pin Carga', color: '#dfa758', stack: 'total' },
                { data: mockDispositivoFalla.map(d => d.software), label: 'Software', color: '#a39d93', stack: 'total' }
              ]}
              margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
            />
          </DashboardCard>
        </Box>

        {/* FILA 5: Rentabilidad / Performance (8) y Matriz Quadrante (9) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.5fr' }, gap: { xs: 2, md: 3 } }}>
          <DashboardCard title="Performance Técnico (Éxito vs Devolución)" height={400}>
             <BarChart
                xAxis={[{ scaleType: 'band', data: mockTecnicos.map(t => t.nombre) }]}
                series={[
                  { data: mockTecnicos.map(t => t.exitosas), label: 'Terminadas OK', color: '#12684e' },
                  { data: mockTecnicos.map(t => t.devueltas), label: 'Devueltas/Garantía', color: '#a93b32' }
                ]}
                margin={{ top: 20, bottom: 25, left: 40, right: 20 }}
              />
          </DashboardCard>
          
          <DashboardCard title="Matriz: Demanda vs Rentabilidad" height={400}>
            <ScatterChart
                xAxis={[{ label: '← Baja Demanda | Cantidad de Reparaciones | Alta Demanda →', min: 0 }]}
                yAxis={[{ label: 'Margen de Rentabilidad (%)', min: 0 }]}
                series={mockMatriz.map((item) => ({
                  type: 'scatter',
                  id: item.id,
                  label: item.servicio,
                  color: item.color,
                  // El eje Z mapea el tamaño de la burbuja (facturación)
                  data: [{ x: item.x, y: item.y, z: item.z, id: item.id }], 
                }))}
                margin={{ top: 20, bottom: 50, left: 60, right: 20 }}
                // Personalizamos el tamaño de las burbujas
                zAxis={[{ data: mockMatriz.map(m => m.z), min: 0, max: 20000 }]} 
              />
          </DashboardCard>
        </Box>

      </Box>
    </Box>
  );
}
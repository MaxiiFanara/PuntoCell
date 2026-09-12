import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  BarChart, 
  PieChart, 
} from '@mui/x-charts';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';

// ==========================================
// 1. DATOS DE PRUEBA (MOCKS)
// ==========================================

// Aging Analysis (Productos sin movimiento)
const mockAging = {
  categorias: ['0-30 días', '31-60 días', '61-90 días', '91-180 días', '+180 días'],
  cantidades: [500, 250, 120, 80, 40],
};

// Valorización económica del stock inmovilizado (Para el gráfico de Dono)
// ¿Cuánto dinero está trabado en esos productos viejos?
const mockValorizacion = [
  { id: 0, value: 45000, label: '0-30 días', color: '#12684e' },   // Sano
  { id: 1, value: 22500, label: '31-60 días', color: '#4cbf93' },  // Normal
  { id: 2, value: 10800, label: '61-90 días', color: '#dfa758' },  // Prestar atención
  { id: 3, value: 7200, label: '91-180 días', color: '#c08d42' },  // Riesgo (Warning oscuro)
  { id: 4, value: 3600, label: '+180 días', color: '#a93b32' },    // Crítico (Error)
];

// ==========================================
// 2. COMPONENTE WRAPPER BLINDADO
// ==========================================
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

// ==========================================
// 3. VISTA PRINCIPAL
// ==========================================
export default function DashboardInventario() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <PageHeader 
        eyebrow="Dashboard" 
        title="Módulo de Inventario" 
        meta="Análisis de antigüedad (Aging) y rotación de productos." 
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        
        {/* FILA 1: KPIs */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          <KpiCard eyebrow="Total Artículos" value="990" sub="Unidades físicas" tone="mute" />
          <KpiCard eyebrow="Capital Inmovilizado" value="U$S 89,100" sub="Valorización a costo" tone="info" />
          <KpiCard eyebrow="Riesgo de Obsolescencia" value="120" sub="Productos con +90 días" tone="error" />
          <KpiCard eyebrow="Índice de Rotación" value="4.2" sub="Veces por año" tone="ok" />
        </Box>

        {/* FILA 2: Aging Analysis (Cantidades físicas vs Valorización Financiera) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: { xs: 2, md: 3 } }}>
          
          <DashboardCard title="Productos sin movimiento (Cantidades)">
            <BarChart
              xAxis={[{ scaleType: 'band', data: mockAging.categorias, label: 'Días sin registrar ventas' }]}
              series={[
                { 
                  data: mockAging.cantidades, 
                  label: 'Cantidad de Productos', 
                  // Usamos una función para pintar las barras de rojo a medida que son más viejas
                  color: '#12684e' 
                }
              ]}
              margin={{ top: 20, bottom: 50, left: 40, right: 20 }}
            />
          </DashboardCard>
          
          <DashboardCard title="Valorización del Stock Estancado (U$S)">
            <PieChart
              series={[{
                data: mockValorizacion,
                innerRadius: '45%',
                outerRadius: '85%',
                paddingAngle: 2,
                cornerRadius: 4,
              }]}
              margin={{ top: 10, bottom: 70, left: 10, right: 10 }}
              slotProps={{ 
                legend: { 
                  direction: 'row', 
                  position: { vertical: 'bottom', horizontal: 'middle' },
                  itemMarkWidth: 10,
                  itemMarkHeight: 10,
                } 
              }}
            />
          </DashboardCard>

        </Box>

      </Box>
    </Box>
  );
}
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CardActionArea, Paper } from '@mui/material';
import {
  PointOfSale,
  ShoppingCartCheckout,
  Inventory2,
  Build,
  FactCheck,
  AccountBalanceWallet
} from '@mui/icons-material';

import PageHeader from '../components/ui/PageHeader'; // Ajustá el path según donde esté tu DashboardPage

const DASHBOARD_MODULES = [
  {
    id: 'ventas',
    title: 'Módulo de Ventas',
    desc: 'Evolución, Ticket promedio, Pareto y Proyecciones.',
    path: '/app/dashboard/ventas',
    icon: PointOfSale,
    color: 'primary.main',
    bgIcon: 'pc.accentSoft'
  },
  {
    id: 'compras',
    title: 'Módulo de Compras',
    desc: 'Costos, Proveedores, Punto de reposición y EOQ.',
    path: '/app/dashboard/compras',
    icon: ShoppingCartCheckout,
    color: 'warning.main', // Usamos los tonos de tu tema
    bgIcon: 'warning.light'
  },
  {
    id: 'inventario',
    title: 'Módulo de Inventario',
    desc: 'Productos sin movimiento y análisis de rotación.',
    path: '/app/dashboard/inventario',
    icon: Inventory2,
    color: 'info.main',
    bgIcon: 'info.light'
  },
  {
    id: 'reparaciones',
    title: 'Módulo de Reparaciones',
    desc: 'Rentabilidad, Tiempos de servicio, Fallas y Dispositivos.',
    path: '/app/dashboard/reparaciones',
    icon: Build,
    color: 'secondary.main',
    bgIcon: 'pc.surfaceMuted'
  },
  {
    id: 'control',
    title: 'Control / Auditoría',
    desc: 'Matriz empleado por operación.',
    path: '/app/dashboard/control',
    icon: FactCheck,
    color: 'error.main',
    bgIcon: 'error.light'
  },
  {
    id: 'financiero',
    title: 'Financiero / Caja',
    desc: 'Ingresos, Egresos y Márgenes por producto o marca.',
    path: '/app/dashboard/financiero',
    icon: AccountBalanceWallet,
    color: 'success.main',
    bgIcon: 'success.light'
  }
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
      <PageHeader 
        eyebrow="Análisis" 
        title="Dashboards" 
        meta="Seleccioná el módulo que deseás analizar para ver sus métricas detalladas." 
      />

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
        gap: 2.5 
      }}>
        {DASHBOARD_MODULES.map((mod) => {
          const Icon = mod.icon;
          
          return (
            <Paper 
              key={mod.id}
              sx={{ 
                overflow: 'hidden',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (t) => t.vars.palette.pc.liftPop,
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardActionArea 
                onClick={() => navigate(mod.path)}
                sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
              >
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 42, 
                    height: 42, 
                    borderRadius: '10px',
                    bgcolor: mod.bgIcon,
                    color: mod.color,
                    mb: 2
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                
                <Typography sx={{ fontWeight: 600, fontSize: '.95rem', letterSpacing: '-.01em', mb: 0.5 }}>
                  {mod.title}
                </Typography>
                
                <Typography sx={{ color: 'text.secondary', fontSize: '.78rem', lineHeight: 1.45 }}>
                  {mod.desc}
                </Typography>
              </CardActionArea>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
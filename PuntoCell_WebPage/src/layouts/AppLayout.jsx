import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import {
  Storefront,
  AdminPanelSettings,
  Security,
  Inventory2,
  Assessment,
  ReceiptLong,
  Language,
  Menu,
  ChevronLeft,
  Close,
  Dashboard, // Icono para Dashboard
  Build,     // Icono para Reparaciones
} from '@mui/icons-material';

import Navbar from '../components/layout/Navbar';

// Importamos el contexto de autenticación del proyecto base
import { useAuth } from '../context/AuthContext';

const menuItems = [
  {
    name: 'Dashboard',
    path: '/app/dashboard',
    icon: Dashboard,
    color: '#f472b6', // text-pink-400
    hoverBg: 'rgba(244, 114, 182, 0.1)',
    reqAdmin: true, // Solo administradores
  },
  {
    name: 'Reparaciones',
    path: '/app/reparaciones',
    icon: Build,
    color: '#fb923c', // text-orange-400
    hoverBg: 'rgba(251, 146, 60, 0.1)',
  },
  {
    name: 'Registrar una venta',
    path: '/app/punto-venta',
    icon: Storefront,
    color: '#3b82f6', // text-blue-500
    hoverBg: 'rgba(59, 130, 246, 0.1)',
  },
  {
    name: 'Historial de Ventas',
    path: '/app/ventas/historial',
    icon: ReceiptLong,
    color: '#4ade80', // text-green-400
    hoverBg: 'rgba(74, 222, 128, 0.1)',
  },
  {
    name: 'Inventario',
    path: '/app/inventario',
    icon: Inventory2,
    color: '#f87171', // text-red-400
    hoverBg: 'rgba(248, 113, 113, 0.1)',
  },
  {
    name: 'Compras',
    path: '/app/compras',
    icon: Storefront,
    color: '#71f8b2', // text-red-400
    hoverBg: 'rgba(248, 113, 113, 0.1)',
  },
  {
    name: 'Precios',
    path: '/app/precios',
    icon: Storefront,
    color: '#11cffa', // text-red-400
    hoverBg: 'rgba(248, 113, 113, 0.1)',
  },
  {
    name: 'Reportes',
    path: '/app/reportes',
    icon: Assessment,
    color: '#818cf8', // text-indigo-400
    hoverBg: 'rgba(129, 140, 248, 0.1)',
  },
  {
    name: 'Usuarios',
    path: '/app/admin/usuarios',
    icon: AdminPanelSettings,
    color: '#c084fc', // text-purple-400
    hoverBg: 'rgba(192, 132, 252, 0.1)',
    reqAdmin: true,
  },
  {
    name: 'Bitácora',
    path: '/app/admin/bitacora',
    icon: Security,
    color: '#22d3ee', // text-cyan-400
    hoverBg: 'rgba(34, 211, 238, 0.1)',
    reqAdmin: true,
  },
  {
    name: 'Landing',
    path: '/',
    icon: Language,
    color: '#facc15', // text-yellow-400
    hoverBg: 'rgba(250, 204, 21, 0.1)',
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Extraemos el usuario actual
  const { usuario } = useAuth();

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  // Filtramos el menú basándonos en el rol del usuario actual
  const menuFiltrado = menuItems.filter((item) => {
    if (item.reqAdmin) {
      return usuario?.rol === 1 || usuario?.rol === 2;
    }
    return true;
  });

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#020617', overflow: 'hidden' }}>
      
      {/* ================= MOBILE OVERLAY ================= */}
      {mobileOpen && (
        <Box
          onClick={closeMobileMenu}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 40,
            display: { lg: 'none' }
          }}
        />
      )}
      
      {/* ================= SIDEBAR ================= */}
      <Box
        component="aside"
        sx={{
          position: { xs: 'fixed', lg: 'relative' },
          zIndex: { xs: 50, lg: 'auto' },
          height: '100vh',
          bgcolor: '#0f172a',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          width: mobileOpen ? 288 : (collapsed ? { lg: 96 } : { lg: 288 }),
          transform: mobileOpen ? 'translateX(0)' : { xs: 'translateX(-100%)', lg: 'translateX(0)' },
        }}
      >
      

        {/* Header */}
        <Box sx={{ height: 80, px: 2, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {(!collapsed || mobileOpen) && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                Punto <Box component="span" sx={{ color: '#3b82f6' }}>Cell</Box>
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Sistema de Gestión
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            
            {/* Desktop collapse */}
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              sx={{
                display: { xs: 'none', lg: 'flex' },
                width: 40,
                height: 40,
                borderRadius: 3,
                color: '#94a3b8',
                '&:hover': { color: 'white', bgcolor: '#1e293b' },
                transition: 'all 0.2s'
              }}
            >
              <ChevronLeft sx={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </IconButton>

            {/* Mobile close */}
            <IconButton
              onClick={closeMobileMenu}
              sx={{
                display: { lg: 'none' },
                width: 40,
                height: 40,
                borderRadius: 3,
                color: '#94a3b8',
                '&:hover': { color: 'white', bgcolor: '#1e293b' }
              }}
            >
              <Close />
            </IconButton>

          </Box>
        </Box>

        {/* Menu */}
        <Box component="nav" sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {menuFiltrado.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

              return (
                <Box
                  component={Link}
                  to={item.path}
                  key={item.path}
                  onClick={closeMobileMenu}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed && !mobileOpen ? 'center' : 'flex-start',
                    gap: collapsed && !mobileOpen ? 0 : 2,
                    px: 2,
                    py: 1.5,
                    borderRadius: 4,
                    transition: 'all 0.2s',
                    border: '1px solid',
                    borderColor: isActive ? '#334155' : 'transparent',
                    bgcolor: isActive ? '#1e293b' : 'transparent',
                    textDecoration: 'none',
                    '&:hover': { bgcolor: item.hoverBg }
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      minWidth: 44,
                      height: 44,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#1e293b'
                    }}
                  >
                    <Icon sx={{ color: item.color }} />
                  </Box>

                  {/* Text */}
                  {(!collapsed || mobileOpen) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          color: isActive ? 'white' : '#cbd5e1'
                        }}
                      >
                        {item.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Acceder al módulo
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid #1e293b' }}>
          {/* Mostramos info del usuario logueado */}
          {(!collapsed || mobileOpen) && usuario && (
            <Box sx={{ px: 2, pb: 2, mb: 1, borderBottom: '1px dashed #1e293b' }}>
              <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                {usuario.nombre || 'Usuario'}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {usuario.rol === 1 || usuario.rol === 2 ? 'Administrador' : 'Empleado'}
              </Typography>
            </Box>
          )}

        </Box>

      </Box>

      {/* ================= CONTENT ================= */}
      <Box component="main" sx={{ flex: 1, overflow: 'auto', bgcolor: '#020617' }}>

        {/* Topbar */}
        <Box 
          sx={{ 
            height: 80, 
            borderBottom: '1px solid #1e293b', 
            px: { xs: 2, lg: 4 }, 
            display: { xs: 'flex', lg: 'none' }, 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Mobile hamburger */}
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                color: '#cbd5e1',
                '&:hover': { bgcolor: '#1e293b' }
              }}
            >
              <Menu />
            </IconButton>
          </Box>
        </Box>


        {/* Navbar */}
        <Navbar />

        {/* Pages */}
        <Outlet />

      </Box>

    </Box>
  );
}
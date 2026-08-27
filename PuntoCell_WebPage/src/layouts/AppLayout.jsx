import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import {
  ShoppingCartCheckout,
  Sell,
  Storefront,
  AdminPanelSettings,
  Security,
  Inventory2,
  Assessment,
  ReceiptLong,
  Language,
  Menu as MenuIcon,
  ChevronLeft,
  Close,
  Dashboard,
  Build,
} from '@mui/icons-material';

import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';

const RAIL = 232;
const RAIL_COLAPSADO = 68;

// El menú va agrupado como en el mockup: lo que se hace todos los días arriba,
// lo que se administra abajo.
const GRUPOS = [
  {
    titulo: 'Operación',
    items: [
      { name: 'Dashboard',           path: '/app/dashboard',        icon: Dashboard,  reqAdmin: true },
      { name: 'Reparaciones',        path: '/app/reparaciones',     icon: Build },
      { name: 'Registrar una venta', path: '/app/punto-venta',      icon: Storefront },
      { name: 'Historial de ventas', path: '/app/ventas/historial', icon: ReceiptLong },
      { name: 'Inventario',          path: '/app/inventario',       icon: Inventory2 },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { name: 'Compras',  path: '/app/compras',        icon: ShoppingCartCheckout },
      { name: 'Precios',  path: '/app/precios',        icon: Sell },
      { name: 'Reportes', path: '/app/reportes',       icon: Assessment },
      { name: 'Usuarios', path: '/app/admin/usuarios', icon: AdminPanelSettings, reqAdmin: true },
      { name: 'Bitácora', path: '/app/admin/bitacora', icon: Security,           reqAdmin: true },
      { name: 'Landing',  path: '/',                   icon: Language },
    ],
  },
];

const ROL_LABEL = { 1: 'Administrador', 2: 'Owner', 3: 'Vendedor', 4: 'Técnico' };

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario } = useAuth();

  const compacto = collapsed && !mobileOpen;
  const cerrarMobile = () => setMobileOpen(false);

  const permitido = (item) =>
    !item.reqAdmin || usuario?.rol === 1 || usuario?.rol === 2;

  const iniciales = usuario?.user
    ? usuario.user.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {mobileOpen && (
        <Box
          onClick={cerrarMobile}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,.45)', zIndex: 40, display: { lg: 'none' } }}
        />
      )}

      {/* ─── Rail ─────────────────────────────────────────────── */}
      <Box
        component="aside"
        sx={{
          position: { xs: 'fixed', lg: 'sticky' },
          top: 0,
          zIndex: { xs: 50, lg: 'auto' },
          height: '100vh',
          flex: 'none',
          width: mobileOpen ? RAIL : { xs: RAIL, lg: compacto ? RAIL_COLAPSADO : RAIL },
          transform: mobileOpen ? 'translateX(0)' : { xs: 'translateX(-100%)', lg: 'none' },
          transition: 'width .2s ease, transform .25s ease',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          p: '16px 12px',
          overflowY: 'auto',
        }}
      >
        {/* Marca */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, minHeight: 30 }}>
          <Box
            sx={{
              width: 30, height: 30, borderRadius: '9px', flex: 'none',
              bgcolor: 'primary.main', color: 'primary.contrastText',
              display: 'grid', placeItems: 'center',
              fontWeight: 700, fontSize: '.78rem', letterSpacing: '-.02em',
            }}
          >
            PC
          </Box>
          {!compacto && (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '.9rem', letterSpacing: '-.015em' }}>
                Punto Cell
              </Typography>
              <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-3px' }}>
                Sistema de gestión
              </Typography>
            </Box>
          )}
          <IconButton
            onClick={cerrarMobile}
            size="small"
            sx={{ display: { lg: 'none' }, ml: 'auto' }}
            aria-label="Cerrar menú"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Navegación */}
        {GRUPOS.map((grupo) => {
          const items = grupo.items.filter(permitido);
          if (!items.length) return null;

          return (
            <Box component="nav" key={grupo.titulo} sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!compacto && (
                <Box sx={{ typography: 'eyebrow', color: 'text.disabled', px: '9px', mb: '6px' }}>
                  {grupo.titulo}
                </Box>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const activo =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

                return (
                  <Box
                    component={Link}
                    to={item.path}
                    key={item.path}
                    onClick={cerrarMobile}
                    title={compacto ? item.name : undefined}
                    aria-current={activo ? 'page' : undefined}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: compacto ? 'center' : 'flex-start',
                      gap: 1.25,
                      p: '8px 9px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '.8125rem',
                      fontWeight: activo ? 600 : 500,
                      color: activo ? 'primary.contrastText' : 'text.secondary',
                      bgcolor: activo ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: activo ? 'primary.dark' : 'pc.surfaceMuted',
                        color: activo ? 'primary.contrastText' : 'text.primary',
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 18, flex: 'none', opacity: activo ? 1 : 0.75 }} />
                    {!compacto && <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{item.name}</Box>}
                  </Box>
                );
              })}
            </Box>
          );
        })}

        {/* Usuario + colapsar */}
        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {usuario && (
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: '9px', borderRadius: '9px',
                bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'pc.dividerSoft',
              }}
            >
              <Box
                sx={{
                  width: 30, height: 30, borderRadius: '50%', flex: 'none',
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                  display: 'grid', placeItems: 'center', fontSize: '.69rem', fontWeight: 700,
                }}
              >
                {iniciales}
              </Box>
              {!compacto && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {usuario.user || 'Usuario'}
                  </Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-3px' }}>
                    {ROL_LABEL[usuario.rol] || 'Empleado'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            size="small"
            sx={{ display: { xs: 'none', lg: 'flex' }, alignSelf: compacto ? 'center' : 'flex-end' }}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <ChevronLeft sx={{ fontSize: 18, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </IconButton>
        </Box>
      </Box>

      {/* ─── Contenido ────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Navbar onAbrirMenu={() => setMobileOpen(true)} />
        <Outlet />
      </Box>
    </Box>
  );
}

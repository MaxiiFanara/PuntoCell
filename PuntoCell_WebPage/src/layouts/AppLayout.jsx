import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
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
  ChevronLeft,
  Close,
  Dashboard,
  Build,
  LightModeOutlined,
  DarkModeOutlined,
} from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';

import Navbar from '../components/layout/Navbar';
import AsistenteUsuarioChat from '../components/modals/AsistenteUsuarioChat';
import { useAuth } from '../context/AuthContext';

const RAIL = 232;
const RAIL_COLAPSADO = 68;

const GRUPOS = [
  {
    titulo: 'Operación',
    items: [
      { name: 'Dashboard',           path: '/app/dashboard',        icon: Dashboard,  reqAdmin: true },
      { name: 'Reparaciones',        path: '/app/reparaciones',     icon: Build },
      { name: 'Registrar una venta', path: '/app/punto-venta',      icon: Storefront },
      { name: 'Historial de Ventas', path: '/app/ventas/historial', icon: ReceiptLong },
      { name: 'Inventario',          path: '/app/inventario',       icon: Inventory2 },
      { name: 'Caja',                path: '/app/caja',             icon: Assessment },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { name: 'Compras',  path: '/app/compras',        icon: ShoppingCartCheckout, reqAdmin: true },
      { name: 'Precios',  path: '/app/precios',        icon: Sell,                 reqAdmin: true },
      { name: 'Reportes', path: '/app/reportes',       icon: Assessment },
      { name: 'Usuarios', path: '/app/admin/usuarios', icon: AdminPanelSettings,   reqAdmin: true },
      { name: 'Bitácora', path: '/app/admin/bitacora', icon: Security,             reqAdmin: true },
      { name: 'Landing',  path: '/',                   icon: Language },
    ],
  },
];

const ROL_LABEL = { 1: 'Administrador', 2: 'Owner', 3: 'Vendedor', 4: 'Técnico' };

const SECCIONES = [
  { path: '/app/dashboard', nombre: 'Dashboard', detalle: 'Sirve para ver métricas generales y accesos rápidos de administración.' },
  { path: '/app/reparaciones', nombre: 'Reparaciones', detalle: 'Usalo para gestionar órdenes, estados y seguimiento de equipos.' },
  { path: '/app/punto-venta', nombre: 'Punto de venta', detalle: 'Usalo para registrar ventas rápidas y cobrar operaciones del mostrador.' },
  { path: '/app/ventas/historial', nombre: 'Historial de ventas', detalle: 'Te muestra las ventas ya registradas y permite revisarlas.' },
  { path: '/app/inventario', nombre: 'Inventario', detalle: 'Acá podés consultar stock, movimientos y detalles de artículos.' },
  { path: '/app/caja', nombre: 'Caja', detalle: 'Te permite revisar y operar sobre movimientos, aperturas y cierres.' },
  { path: '/app/compras', nombre: 'Compras', detalle: 'Se usa para ingresar compras y abastecimiento del negocio.' },
  { path: '/app/precios', nombre: 'Precios', detalle: 'Permite administrar listas y valores de venta.' },
  { path: '/app/reportes', nombre: 'Reportes', detalle: 'Sirve para consultar reportes y resumir información operativa.' },
  { path: '/app/admin/usuarios', nombre: 'Usuarios', detalle: 'Acá se administran los usuarios.' },
  { path: '/app/admin/bitacora', nombre: 'Bitácora', detalle: 'Muestra el historial de acciones y eventos del sistema.' },
];

const resolvePantalla = (pathname) => SECCIONES.find((section) => pathname === section.path || pathname.startsWith(`${section.path}/`)) ?? {
  path: pathname,
  nombre: 'Sistema',
  detalle: 'Preguntame sobre esta pantalla y te explico cómo usarla.'
};

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const { usuario } = useAuth();

  // Control de modo oscuro/claro en el panel interno
  const { mode, setMode } = useColorScheme();
  const esOscuro = mode === 'dark';

  const pantallaActual = useMemo(() => resolvePantalla(location.pathname), [location.pathname]);

  const compacto = collapsed && !mobileOpen;
  const cerrarMobile = () => setMobileOpen(false);

  const permitido = (item) =>
    !item.reqAdmin || usuario?.rol === 1 || usuario?.rol === 2;

  const nombreUsuario = usuario?.user || usuario?.nombre || 'Usuario';
  const iniciales = nombreUsuario
    ? nombreUsuario.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
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

        {/* Usuario, Tema + colapsar */}
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
                    {nombreUsuario}
                  </Typography>
                  <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-3px' }}>
                    {ROL_LABEL[usuario.rol] || 'Empleado'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Botón de cambio de tema y colapsar en la barra lateral */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: compacto ? 'center' : 'space-between', px: 0.5 }}>
            <Tooltip title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
              <IconButton
                onClick={() => setMode(esOscuro ? 'light' : 'dark')}
                size="small"
                aria-label="Cambiar modo de color"
                sx={{ border: 1, borderColor: 'divider', borderRadius: '8px', p: '6px' }}
              >
                {esOscuro ? <LightModeOutlined sx={{ fontSize: 17 }} /> : <DarkModeOutlined sx={{ fontSize: 17 }} />}
              </IconButton>
            </Tooltip>

            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              size="small"
              sx={{ display: { xs: 'none', lg: 'flex' } }}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <ChevronLeft sx={{ fontSize: 18, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* ─── Contenido ────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Navbar onAbrirMenu={() => setMobileOpen(true)} onAbrirAyuda={() => setAsistenteAbierto(true)} />
        <AsistenteUsuarioChat
          open={asistenteAbierto}
          onClose={() => setAsistenteAbierto(false)}
          usuario={usuario}
          pantalla={pantallaActual}
        />
        <Outlet />
      </Box>
    </Box>
  );
}
import { Link, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { Group } from '@mui/icons-material';

// Ya hay un rail principal en AppLayout: esto es una franja liviana de tabs,
// no un segundo sidebar. Mismo lenguaje visual que los ítems del rail.
const ITEMS = [
  { name: 'Usuarios', path: '/app/admin/usuarios', icon: Group },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <Box component="nav" aria-label="Secciones de administración" sx={{ display: 'flex', gap: 0.5, overflowX: 'auto' }}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const activo = location.pathname.startsWith(item.path);

        return (
          <Box
            component={Link}
            to={item.path}
            key={item.path}
            aria-current={activo ? 'page' : undefined}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.875,
              flex: 'none',
              p: '7px 12px',
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
            <Icon sx={{ fontSize: 17, opacity: activo ? 1 : 0.75 }} />
            {item.name}
          </Box>
        );
      })}
    </Box>
  );
};

export default Sidebar;

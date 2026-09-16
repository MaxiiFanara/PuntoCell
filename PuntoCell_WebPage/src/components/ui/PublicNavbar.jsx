import { Badge, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Link, useLocation } from 'react-router-dom';

import { useCart } from '../../features/catalogo/context/CartContext';

/**
 * Barra única de la cara pública (landing + catálogo).
 *
 * Antes eran dos componentes distintos: la landing con Archivo a 64px y el
 * catálogo con `"Playfair Display", serif` a 88px. Esa fuente nunca se carga
 * (index.html sólo trae Archivo e IBM Plex Mono), así que el catálogo caía a un
 * serif del sistema y parecía otra empresa. Uno solo, misma marca en los dos.
 *
 * El botón del carrito se dibuja únicamente donde hay CartProvider: fuera del
 * catálogo `useCart()` devuelve undefined y la barra sigue funcionando.
 */
export default function PublicNavbar() {
  const { pathname } = useLocation();
  const cart = useCart();
  const enCatalogo = pathname.startsWith('/catalogo');

  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: { xs: 2.5, md: 5 },
        height: 64,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        component={Link}
        to="/"
        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none' }}
      >
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '9px', flex: 'none',
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: '.82rem', letterSpacing: '-.02em',
          }}
        >
          PC
        </Box>
        <Typography sx={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-.02em', color: 'text.primary' }}>
          Punto Cell
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {!enCatalogo && (
          <Button component={Link} to="/catalogo" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Catálogo
          </Button>
        )}

        <Button
          component={Link}
          to="/login"
          variant="outlined"
          startIcon={<LockPersonIcon sx={{ fontSize: '16px !important' }} />}
        >
          Gestión
        </Button>

        {cart && (
          <Tooltip title="Tu carrito">
            <IconButton
              onClick={() => cart.setIsOpen(true)}
              aria-label={`Abrir carrito (${cart.totalItems} productos)`}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: '8px',
                width: 32,
                height: 32,
                color: 'text.secondary',
                '&:hover': { bgcolor: 'pc.surfaceMuted', color: 'text.primary' },
              }}
            >
              <Badge badgeContent={cart.totalItems} color="primary">
                <ShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

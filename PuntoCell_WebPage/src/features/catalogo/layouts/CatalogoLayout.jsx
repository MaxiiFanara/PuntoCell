import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import { ProductProvider } from '../context/ProductContext';
import { CartProvider } from '../context/CartContext';

import PublicNavbar from '../../../components/ui/PublicNavbar';
import CartDrawer from '../components/CartDrawer';
import PublicFooter from '../../../components/ui/PublicFooter';
import WhatsappFloating from '../components/WhatsappFloating';

// El catálogo hereda el tema único del root (src/theme). No tiene tema propio.
export default function CatalogoLayout() {
  const { pathname } = useLocation();

  // BrowserRouter + <Routes> no es un data router, así que no hay
  // <ScrollRestoration/>: al navegar de la vitrina al detalle el scroll se
  // quedaba donde estaba. Va acá, en el layout, y no en cada card, así cubre
  // también los enlaces que entran desde la landing.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <ProductProvider>
      <CartProvider>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          <PublicNavbar />
          <CartDrawer />

          <Box component="main" sx={{ flexGrow: 1 }}>
            <Outlet />
          </Box>

          <PublicFooter />
          <WhatsappFloating />
        </Box>
      </CartProvider>
    </ProductProvider>
  );
}

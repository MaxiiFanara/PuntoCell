import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import { ProductProvider } from '../context/ProductContext';
import { CartProvider } from '../context/CartContext';
import { CompareProvider } from '../context/CompareContext';

import PublicNavbar from '../../../components/ui/PublicNavbar';
import CartDrawer from '../components/CartDrawer';
import CompareBar from '../components/CompareBar';
import PublicFooter from '../../../components/ui/PublicFooter';
import WhatsappFloating from '../components/WhatsappFloating';
import CatalogAssistantChat from '../components/CatalogAssistantChat';
import { shell } from '../../../components/ui/publicStyles';

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
        <CompareProvider>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
            // Un lavado verde suave arriba a la derecha: le da atmósfera al catálogo sin
            // pelearse con las tarjetas. Usa el verde del tema, así sigue al modo claro/oscuro.
            backgroundImage:
              'radial-gradient(60% 520px at 88% -80px, color-mix(in srgb, var(--pc-palette-primary-main) 17%, transparent), transparent 70%), radial-gradient(40% 420px at 0% 340px, color-mix(in srgb, var(--pc-palette-primary-main) 7%, transparent), transparent 70%)',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <PublicNavbar />
          <CartDrawer />

          {/* El ancho y el ritmo de la vitrina viven acá, una sola vez: 1180px
              con el gutter de publicStyles y el aire de la cara pública. Las
              vistas ya no traen contenedor propio. */}
          <Box
            component="main"
            sx={{ ...shell, flexGrow: 1, pt: '2.25rem', pb: 'clamp(5rem, 8vw, 7rem)' }}
          >
            <Outlet />
          </Box>

          <PublicFooter />
          <WhatsappFloating />
          <CatalogAssistantChat />
          <CompareBar />
        </Box>
        </CompareProvider>
      </CartProvider>
    </ProductProvider>
  );
}

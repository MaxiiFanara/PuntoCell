import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

import { ProductProvider } from '../context/ProductContext';
import { CartProvider } from '../context/CartContext';

import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';
import Footer from '../components/Footer';
import WhatsappFloating from '../components/WhatsappFloating';

// El catálogo hereda el tema único del root (src/theme). No tiene tema propio.
export default function CatalogoLayout() {
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
          <Navbar />
          <CartDrawer />

          <Box component="main" sx={{ flexGrow: 1 }}>
            <Outlet />
          </Box>

          <Footer />
          <WhatsappFloating />
        </Box>
      </CartProvider>
    </ProductProvider>
  );
}

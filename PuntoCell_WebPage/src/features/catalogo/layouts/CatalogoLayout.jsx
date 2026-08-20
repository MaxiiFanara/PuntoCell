import { Outlet } from 'react-router-dom';
import { Box, ThemeProvider, createTheme } from '@mui/material';

// 1. Importamos tus contextos del catálogo
import { ProductProvider } from '../context/ProductContext';
import { CartProvider } from '../context/CartContext';

// 2. Importamos los componentes visuales del catálogo
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';
import Footer from '../components/Footer';
import WhatsappFloating from '../components/WhatsappFloating';

// 3. Importamos el tema específico del catálogo (los colores azules limpios)
// Asegúrate de que la ruta apunte correctamente a donde guardaste el theme
import puntocellTheme from '../../../theme/presets/puntocell'; 

const theme = createTheme(puntocellTheme);

export default function CatalogoLayout() {
  return (
    // Envolvemos SOLO el catálogo con su propio tema y contextos
    <ThemeProvider theme={theme}>
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
            {/* Cabecera del catálogo */}
            <Navbar />
            <CartDrawer />

            {/* Contenido dinámico (Aquí se inyectarán las páginas del catálogo) */}
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Outlet />
            </Box>

            {/* Pie de página del catálogo */}
            <Footer />
            <WhatsappFloating />
          </Box>
        </CartProvider>
      </ProductProvider>
    </ThemeProvider>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ProductInfoSection from './ProductInfoSection';
import ProductCard from '../components/ProductCard';
import ProductImagePlaceholder from '../components/ProductImagePlaceholder';
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const { addToCart } = useCart();

  const product = products.find((p) => String(p.id) === String(id));

  const relacionados = products
    .filter((p) => p.id !== product?.id && p.category === product?.category)
    .slice(0, 4);

  if (loading) return null;

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ pt: 3, pb: 10 }}>
        <CatalogBreadcrumbs current="Producto no encontrado" />
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          No encontramos este producto. Puede que ya no esté publicado.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/catalogo')}>
          Volver al catálogo
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 10 }}>
      <CatalogBreadcrumbs current={product.name} />

      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: '16px !important' }} />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2.5, ml: -1.5 }}
      >
        Volver
      </Button>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 6fr)' },
          gap: { xs: 4, md: 6 },
          alignItems: 'start',
        }}
      >
        {/* La proporción la pone el placeholder. Antes este contenedor forzaba
            600px de alto en media pantalla y la imagen salía como una tira. */}
        <Box
          sx={{
            position: { md: 'sticky' },
            top: 88,
            borderRadius: '10px',
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <ProductImagePlaceholder categoria={product.category} iconSize={64} />
        </Box>

        <Box>
          <ProductInfoSection product={product} addToCart={addToCart} />
        </Box>
      </Box>

      {relacionados.length > 0 && (
        <Box sx={{ mt: { xs: 7, md: 9 }, pt: { xs: 5, md: 6 }, borderTop: 1, borderColor: 'divider' }}>
          <Typography
            component="h2"
            sx={{ fontSize: { xs: '1.25rem', md: '1.4rem' }, fontWeight: 600, letterSpacing: '-.025em', mb: 2.5 }}
          >
            Más en {product.category ? product.category.toLowerCase() : 'el catálogo'}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 2,
            }}
          >
            {relacionados.map((item) => <ProductCard key={item.id} product={item} />)}
          </Box>
        </Box>
      )}
    </Container>
  );
}

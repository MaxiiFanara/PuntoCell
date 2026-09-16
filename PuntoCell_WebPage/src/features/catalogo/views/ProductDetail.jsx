import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Typography, Button, Box, Alert } from '@mui/material';
import ProductInfoSection from './ProductInfoSection';
import ProductCard from '../components/ProductCard';
import ProductImagePlaceholder from '../components/ProductImagePlaceholder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const product = products.find((p) => p.id === id);
  const relatedProducts = products.filter((p) => p.id !== product?.id && p.category === product?.category).slice(0, 4);

  if (!product) return (
    <Container sx={{ py: 10, textAlign: 'center' }}>
      <Alert severity="warning">Producto no encontrado.</Alert>
      <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/catalogo')}>Volver al catálogo</Button>
    </Container>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="xl">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 4, color: 'text.secondary', '&:hover': { backgroundColor: 'transparent', color: 'text.primary' } }}>Volver</Button>
        <Grid container spacing={{ xs: 5, md: 8 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ position: { md: 'sticky' }, top: 110 }}>
              <Box sx={{ width: '100%', height: { xs: 360, md: 600 }, borderRadius: 6, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.10)' }}>
                <ProductImagePlaceholder categoria={product.category} iconSize={72} />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <ProductInfoSection product={product} addToCart={addToCart} />
          </Grid>
        </Grid>
        {relatedProducts.length > 0 && (
          <Box sx={{ mt: 10 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>También te puede interesar</Typography>
            <Grid container spacing={3}>
              {relatedProducts.map((item) => <Grid item xs={12} sm={6} md={3} key={item.id}><ProductCard product={item} /></Grid>)}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}

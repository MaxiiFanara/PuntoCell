import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Typography, Button, Box, Alert } from '@mui/material';
import ProductInfoSection from './ProductInfoSection';
import ProductCard from '../components/ProductCard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '@mui/material/styles';

const FALLBACK_IMG = 'https://via.placeholder.com/800x1000?text=Sin+imagen';

export default function ProductDetail() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const product = products.find((p) => p.id === id);
  const relatedProducts = products.filter((p) => p.id !== product?.id && p.category === product?.category).slice(0, 4);
  const [selectedImage, setSelectedImage] = useState(product?.image);
  
  useEffect(() => { if (product?.image) setSelectedImage(product.image); }, [product]);

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
              <Box component="img" src={selectedImage || FALLBACK_IMG} alt={product.name} onError={(e) => { e.target.src = FALLBACK_IMG; }} sx={{ width: '100%', height: { xs: 360, md: 600 }, objectFit: 'cover', borderRadius: 6, backgroundColor: theme.palette.background.paper, boxShadow: '0 18px 50px rgba(0,0,0,0.10)', transition: 'transform .35s ease', '&:hover': { transform: 'scale(1.01)' } }} />
            </Box>
            {product.gallery?.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {[product.image, ...product.gallery].map((img, index) => (
                  <Box key={index} component="img" src={img} onClick={() => setSelectedImage(img)} sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 2, cursor: 'pointer', border: selectedImage === img ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}` }} />
                ))}
              </Box>
            )}
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

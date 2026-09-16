import { Card, CardContent, CardActions, Typography, Button, Chip, Box, IconButton, Tooltip, Stack } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { STORE_CONFIG } from '../config/store';
import ProductImagePlaceholder from './ProductImagePlaceholder';
import { formatCategoria } from '../utils/categorias';


const { productPage } = STORE_CONFIG;

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const theme = useTheme();
  const navigate = useNavigate();
  const discount = product.comparePrice && product.comparePrice > product.price ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : null;

  return (
    <Card onClick={() => navigate(`/catalogo/product/${product.id}`)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', backgroundColor: theme.palette.background.paper, transition: 'all 0.45s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: theme.custom.cards.hover, '& .product-image': { transform: 'scale(1.06)' }, '& .product-overlay': { opacity: 1 } } }}>
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box className="product-image" sx={{ height: { xs: 180, sm: 280, md: 220 }, transition: 'transform 0.7s ease' }}>
          <ProductImagePlaceholder categoria={product.category} />
        </Box>
        <Box className="product-overlay" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.28), rgba(0,0,0,0.02))', opacity: 0, transition: 'opacity 0.35s ease' }} />
        {product.category && <Chip label={formatCategoria(product.category)} size="small" sx={{ position: 'absolute', top: 14, left: 14, backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, fontSize: '0.68rem', fontWeight: 600, backdropFilter: 'blur(10px)' }} />}
        {product.featured && <Chip label="Destacado" color="warning" size="small" sx={{ position: 'absolute', top: 14, right: 14, fontWeight: 700, zIndex: 2 }} />}
        {product.stock === 0 && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="overline" sx={{ color: 'white', letterSpacing: '0.15em' }}>{productPage.outOfStockText}</Typography>
          </Box>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, pb: 2, p: { xs: 1.5, sm: 3.5 } }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: { xs: '0.9rem', sm: '1.12rem' }, lineHeight: 1.3, mb: 0.8, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: '-webkit-box' }, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2.4 }}>{product.description}</Typography>
        <Box>
          {discount && <Typography sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.85rem' }}>${formatCurrency(product.comparePrice)}</Typography>}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 700 }}>${formatCurrency(product.price)}</Typography>
            {discount && <Chip label={`${discount}% OFF`} size="small" color="error" />}
          </Stack>
        </Box>
        {product.promotions?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, mb: 1 }}>
            {product.promotions.map((promo, index) => <Chip key={index} label={promo} size="small" color="success" />)}
          </Stack>
        )}
        <Typography variant="body2" sx={{ mt: 0.6, color: 'text.secondary', fontSize: '0.82rem' }}>{product.installmentText || productPage.installmentText}</Typography>
      </CardContent>
      <CardActions sx={{ px: { xs: 1.5, sm: 3.5 }, pb: { xs: 1.5, sm: 3.5 }, pt: 0, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Button variant="contained" color="primary" size="small" startIcon={<AddShoppingCartIcon />} disabled={product.stock === 0} onClick={(e) => { e.stopPropagation(); addToCart(product); }} sx={{ flexGrow: 1 }}>
          {product.stock === 0 ? productPage.outOfStockText : productPage.addToCartText}
        </Button>
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/catalogo/product/${product.id}`); }} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: theme.custom.cards.softBackground, '&:hover': { bgcolor: theme.palette.action.hover } }}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

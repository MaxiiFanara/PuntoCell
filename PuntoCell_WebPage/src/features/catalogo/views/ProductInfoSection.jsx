import { Typography, Button, Box, Chip, Divider, Stack } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { formatCurrency } from '../utils/whatsapp';
import { STORE_CONFIG } from '../config/store';
import { useTheme } from '@mui/material/styles';

const { productPage } = STORE_CONFIG;

export default function ProductInfoSection({ product, addToCart }) {
  const theme = useTheme();
  const discount = product.comparePrice && product.comparePrice > product.price ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : null;

  return (
    <>
      {product.category && (
        <Chip label={product.category} size="small" sx={{ mb: 2, height: 34, px: 1, borderRadius: '999px', backgroundColor: theme.custom.cards.softBackground, color: theme.palette.text.primary, fontWeight: 600 }} />
      )}
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '3rem' }, lineHeight: 1.05, letterSpacing: '-0.04em', mb: 3 }}>{product.name}</Typography>
      <Box sx={{ mb: 2 }}>
        {discount && <Typography sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '1.1rem' }}>${formatCurrency(product.comparePrice)}</Typography>}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', md: '2.5rem' } }}>${formatCurrency(product.price)}</Typography>
          {discount && <Chip label={`${discount}% OFF`} color="error" />}
        </Stack>
      </Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>{product.installmentText || productPage.installmentText}</Typography>
      <Divider sx={{ mb: 4 }} />
      {product.promotions?.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {product.promotions.map((promo) => <Chip key={promo} label={promo} color="success" size="small" />)}
        </Stack>
      )}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1rem', lineHeight: 1.9 }}>{product.description || 'Sin descripción disponible.'}</Typography>
      {(product.material || product.dimensions) && (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {product.material && <Box><Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Material</Typography><Typography variant="body2" color="text.secondary">{product.material}</Typography></Box>}
          {product.dimensions && <Box><Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Dimensiones</Typography><Typography variant="body2" color="text.secondary">{product.dimensions}</Typography></Box>}
        </Stack>
      )}
      <Stack spacing={2.2} sx={{ mb: 5 }}>
        {productPage.benefits.map((benefit) => (
          <Box key={benefit} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkspacePremiumOutlinedIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="body2">{benefit}</Typography>
          </Box>
        ))}
      </Stack>
      {typeof product.stock !== 'undefined' && (
        <Typography variant="body2" sx={{ mb: 4, color: product.stock > 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
          {product.stock > 0 ? `✓ Stock disponible (${product.stock} unidades)` : `✗ ${productPage.outOfStockText}`}
        </Typography>
      )}
      <Button variant="contained" color="primary" size="large" fullWidth startIcon={<AddShoppingCartIcon />} onClick={() => addToCart(product)} disabled={product.stock === 0} sx={{ py: 2 }}>
        {product.stock === 0 ? productPage.outOfStockText : productPage.addToCartText}
      </Button>
    </>
  );
}

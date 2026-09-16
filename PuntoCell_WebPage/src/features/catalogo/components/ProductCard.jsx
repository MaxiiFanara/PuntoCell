import { Box, Button, Link as MuiLink, Paper, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Link } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { STORE_CONFIG } from '../config/store';
import ProductImagePlaceholder from './ProductImagePlaceholder';
import { formatCategoria } from '../utils/categorias';

const { productPage } = STORE_CONFIG;

/**
 * Card única de producto: la usa la grilla del catálogo y la vidriera de la
 * landing. Antes eran dos maquetas distintas y el precio salía gris en una y
 * verde en la otra.
 *
 * El nombre es el enlace real y su ::after cubre la card entera, así todo el
 * bloque es clickeable sin perder foco de teclado ni anidar interactivos.
 * El botón de agregar sólo aparece donde hay CartProvider (la landing no lo
 * monta), y ahí la card entera lleva al detalle.
 */
export default function ProductCard({ product }) {
  const cart = useCart();

  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const sinStock = stock === 0;
  const ultimas = stock !== null && stock > 0 && stock <= 3;

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <Paper
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color .2s, transform .2s',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
        '&:has(a:focus-visible)': { borderColor: 'primary.main' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'border-color .2s' },
      }}
    >
      <Box sx={{ position: 'relative', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
        <ProductImagePlaceholder categoria={product.category} />
        {sinStock && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(0,0,0,.5)',
            }}
          >
            <Typography sx={{ color: '#fff', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {productPage.outOfStockText}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Typography sx={{ fontSize: '.7rem', fontWeight: 600, color: 'text.disabled' }}>
          {formatCategoria(product.category)}
        </Typography>

        <MuiLink
          component={Link}
          to={`/catalogo/product/${product.id}`}
          underline="none"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '.95rem',
            letterSpacing: '-.015em',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            // Cubre la card entera: un solo destino, un solo elemento enfocable.
            '&::after': { content: '""', position: 'absolute', inset: 0 },
          }}
        >
          {product.name}
        </MuiLink>

        <Box sx={{ mt: 0.5 }}>
          {discount && (
            <Typography className="mono" sx={{ fontSize: '.78rem', color: 'text.disabled', textDecoration: 'line-through' }}>
              ${formatCurrency(product.comparePrice)}
            </Typography>
          )}
          <Typography
            className="mono"
            sx={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-.02em', color: 'primary.main' }}
          >
            ${formatCurrency(product.price)}
          </Typography>
        </Box>

        {ultimas && (
          <Typography sx={{ fontSize: '.72rem', fontWeight: 600, color: 'warning.main' }}>
            {stock === 1 ? 'Última unidad' : `Últimas ${stock} unidades`}
          </Typography>
        )}

        {cart && (
          <Button
            variant="outlined"
            fullWidth
            disabled={sinStock}
            startIcon={<AddShoppingCartIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => cart.addToCart(product)}
            // Por encima del ::after del enlace, si no el click cae en la card.
            sx={{ mt: 'auto', pt: 0, position: 'relative', zIndex: 1 }}
          >
            {sinStock ? productPage.outOfStockText : productPage.addToCartText}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

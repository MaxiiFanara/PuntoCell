import { useState } from 'react';
import { Typography, Button, Box, Chip, Divider, Stack, IconButton } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { formatCurrency } from '../utils/whatsapp';
import { STORE_CONFIG } from '../config/store';
import { formatCategoria } from '../utils/categorias';

const { productPage } = STORE_CONFIG;

export default function ProductInfoSection({ product, addToCart }) {
  const [cantidad, setCantidad] = useState(1);

  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const sinStock = stock === 0;
  const tope = stock ?? Infinity;

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const cuotas = product.installmentText || productPage.installmentText;
  const specs = [
    product.material && { label: 'Color', value: product.material },
    product.dimensions && { label: 'Memoria', value: product.dimensions.replace(/^Memoria:\s*/, '') },
  ].filter(Boolean);

  return (
    <>
      {product.category && (
        <Chip
          label={formatCategoria(product.category)}
          size="small"
          sx={(t) => ({
            mb: 2.5,
            height: 26,
            // Vía `t.vars`, no `theme.palette.*` ni el atajo `sx: 'pc.accentSoft'`:
            // con cssVariables el objeto palette queda congelado en el esquema
            // claro, y sx sólo traduce a CSS var las claves estándar — las
            // custom como `pc.*` las resuelve estáticas. Por eso el badge salía
            // con texto negro sobre fondo claro en tema oscuro.
            bgcolor: t.vars.palette.pc.accentSoft,
            color: t.vars.palette.primary.main,
            fontWeight: 700,
          })}
        />
      )}

      {/* Es el h1 de la vista de detalle: la página no tenía ninguno. */}
      <Typography
        component="h1"
        sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.035em', mb: 2.5 }}
      >
        {product.name}
      </Typography>

      <Box sx={{ mb: cuotas ? 1.5 : 3.5 }}>
        {discount && (
          <Typography sx={{ textDecoration: 'line-through', color: 'text.disabled', fontSize: '1rem' }}>
            ${formatCurrency(product.comparePrice)}
          </Typography>
        )}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, fontSize: { xs: '1.7rem', md: '2.25rem' }, letterSpacing: '-0.03em' }}
          >
            ${formatCurrency(product.price)}
          </Typography>
          {discount && <Chip label={`${discount}% OFF`} color="error" size="small" />}
        </Stack>
      </Box>

      {/* Sólo si hay texto: antes se renderizaba un Typography vacío con
          margen y dejaba un hueco muerto debajo del precio. */}
      {cuotas && (
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3.5 }}>
          {cuotas}
        </Typography>
      )}

      <Divider sx={{ mb: 3.5 }} />

      {product.promotions?.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
          {product.promotions.map((promo) => (
            <Chip key={promo} label={promo} color="success" size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3.5, lineHeight: 1.75 }}>
        {product.description || 'Sin descripción disponible.'}
      </Typography>

      {specs.length > 0 && (
        <Stack spacing={0} sx={(t) => ({ mb: 4, borderTop: `1px solid ${t.vars.palette.pc.dividerSoft}` })}>
          {specs.map((spec) => (
            <Box
              key={spec.label}
              sx={(t) => ({
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                py: 1.25,
                borderBottom: `1px solid ${t.vars.palette.pc.dividerSoft}`,
              })}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{spec.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{spec.value}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      {stock !== null && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2.5 }}>
          {/* El ícono también cambia: antes salía un tilde verde-o-rojo incluso
              en "Sin stock", que se leía como confirmación. */}
          {sinStock
            ? <HighlightOffIcon sx={{ fontSize: 17, color: 'error.main' }} />
            : <CheckCircleOutlineIcon sx={{ fontSize: 17, color: 'success.main' }} />}
          <Typography variant="body2" sx={{ color: sinStock ? 'error.main' : 'success.main', fontWeight: 600 }}>
            {sinStock
              ? productPage.outOfStockText
              : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`}
          </Typography>
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
        {!sinStock && tope > 1 && (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 0.5, alignSelf: 'stretch' }}
          >
            <IconButton
              size="small"
              aria-label="Quitar una unidad"
              disabled={cantidad <= 1}
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography sx={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }} className="num">
              {cantidad}
            </Typography>
            <IconButton
              size="small"
              aria-label="Agregar una unidad"
              disabled={cantidad >= tope}
              onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          startIcon={<AddShoppingCartIcon />}
          onClick={() => addToCart(product, cantidad)}
          disabled={sinStock}
          sx={{ height: 46, flexGrow: 1 }}
        >
          {sinStock ? productPage.outOfStockText : productPage.addToCartText}
        </Button>
      </Stack>
    </>
  );
}

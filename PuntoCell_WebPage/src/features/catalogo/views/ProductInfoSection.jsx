import { useState } from 'react';
import { Button, Chip, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';

import { formatCurrency } from '../utils/whatsapp';
import { STORE_CONFIG } from '../config/store';
import { btn, muted, price as priceSx } from '../../../components/ui/publicStyles';

const { productPage } = STORE_CONFIG;

/**
 * La caja de compra del detalle: precio, disponibilidad, cantidad y acción.
 *
 * Es lo único que se lleva el scroll (sticky desde `md`), porque es lo único con
 * lo que se interactúa: el resto de la ficha se lee una vez. En `xs` se apila
 * debajo del contenido y deja de ser sticky, que en una pantalla de 700px de
 * alto sería una caja clavada tapando media ficha.
 *
 * El precio se repite acá a propósito. Está a escala de display arriba a la
 * izquierda, pero cuando se scrolleó hasta las especificaciones ya no se ve, y
 * nadie aprieta "Agregar al carrito" sin el número a la vista.
 */
export default function ProductInfoSection({ product, addToCart }) {
  const [cantidad, setCantidad] = useState(1);

  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const sinStock = stock === 0;
  const tope = stock ?? Infinity;

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const cuotas = product.installmentText || productPage.installmentText;

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        position: { md: 'sticky' },
        top: 96,
      }}
    >
      {discount && (
        <Typography
          className="mono"
          sx={{ ...muted, fontSize: '.8125rem', textDecoration: 'line-through' }}
        >
          ${formatCurrency(product.comparePrice)}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: discount ? 0.5 : 0 }}>
        <Typography sx={priceSx()}>
          ${formatCurrency(product.price)}
        </Typography>
        {discount && <Chip label={`${discount}% OFF`} color="error" size="small" />}
      </Stack>

      {/* Sólo si hay texto: antes se renderizaba un Typography vacío con
          margen y dejaba un hueco muerto debajo del precio. */}
      {cuotas && (
        <Typography sx={{ mt: 1, fontSize: '.875rem', color: 'text.secondary' }}>
          {cuotas}
        </Typography>
      )}

      {stock !== null && (
        <>
          <Divider sx={{ my: 2.5 }} />

          <Stack spacing={1}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {/* El ícono también cambia: antes salía un tilde verde-o-rojo incluso
                  en "Sin stock", que se leía como confirmación. */}
              {sinStock
                ? <HighlightOffIcon sx={{ fontSize: 17, color: 'error.main' }} />
                : <CheckCircleOutlineIcon sx={{ fontSize: 17, color: 'success.main' }} />}
              <Typography
                sx={{ fontSize: '.9375rem', fontWeight: 600, color: sinStock ? 'error.main' : 'success.main' }}
              >
                {sinStock
                  ? productPage.outOfStockText
                  : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`}
              </Typography>
            </Stack>

            {/* El inventario es por sucursal: la misma unidad solo existe en una
                sede. Va en su propio renglón y no separada por un punto medio: en
                una caja angosta el separador quedaba colgando al final de la línea. */}
            {product.sucursal && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <StorefrontOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: '.9375rem', color: 'text.secondary' }}>
                  {product.sucursal}
                </Typography>
              </Stack>
            )}
          </Stack>
        </>
      )}

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {!sinStock && tope > 1 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ height: 48, px: 0.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
          >
            <IconButton
              size="small"
              aria-label="Quitar una unidad"
              disabled={cantidad <= 1}
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              sx={{ '&:active': { transform: 'scale(.94)' } }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography className="num" sx={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
              {cantidad}
            </Typography>
            <IconButton
              size="small"
              aria-label="Agregar una unidad"
              disabled={cantidad >= tope}
              onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
              sx={{ '&:active': { transform: 'scale(.94)' } }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        )}

        <Button
          variant="contained"
          fullWidth
          startIcon={<AddShoppingCartIcon />}
          onClick={() => addToCart(product, cantidad)}
          disabled={sinStock}
          sx={btn}
        >
          {sinStock ? productPage.outOfStockText : productPage.addToCartText}
        </Button>
      </Stack>
    </Paper>
  );
}

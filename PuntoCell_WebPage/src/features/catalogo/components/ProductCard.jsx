import { Box, IconButton, Link as MuiLink, Paper, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import { Link } from 'react-router-dom'

import { useCart } from '../context/CartContext'
import { useCompare, esComparable } from '../context/CompareContext'
import { formatCurrency } from '../utils/whatsapp'
import { formatCategoria } from '../utils/categorias'
import ProductSpecs from './ProductSpecs'
import CategoriaIcon from './CategoriaIcon'
import { hoverLift, muted, price as priceSx } from '../../../components/ui/publicStyles'

/**
 * Card única de producto: la usan la grilla del catálogo y la vitrina de la landing.
 *
 * No lleva imagen. No hay campo de foto en la base y no lo va a haber en este
 * alcance, así que el nombre y el precio ocupan el lugar que tendría la
 * fotografía en vez de dejar un rectángulo gris con un ícono adentro. Si algún
 * día entra `imagen_url`, va arriba del nombre y el resto no se mueve.
 *
 * El nombre es el enlace real y su ::after cubre la card entera, así todo el
 * bloque es clickeable sin perder foco de teclado ni anidar interactivos. El
 * botón de agregar se dibuja por encima de ese ::after y sólo aparece donde hay
 * CartProvider (la landing no lo monta).
 */
export default function ProductCard({ product }) {
  const cart = useCart()
  // Como el carrito, solo existe dentro del catálogo (la landing no lo monta).
  const compare = useCompare()
  const comparable = compare && esComparable(product)
  const enComparacion = comparable && compare.isSelected(product.id)

  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null
  const sinStock = stock === 0
  const ultimas = stock !== null && stock > 0 && stock <= 3

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : null

  const stockTexto = sinStock
    ? 'Sin stock'
    : stock === null
      ? null
      : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`

  return (
    <Paper
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        borderRadius: 2,
        ...(sinStock && { bgcolor: 'pc.surfaceMuted' }),
        ...hoverLift,
        '&:has(a:focus-visible)': { borderColor: 'text.disabled' },
        '@media (hover: hover) and (pointer: fine)': {
          ...hoverLift['@media (hover: hover) and (pointer: fine)'],
          '&:hover .pc-add': { opacity: 1 },
          '&:hover .pc-img img': { transform: 'scale(1.05)' },
        },
      }}
    >
      {/* Fotografía, o un fondo suave con el ícono de la categoría si no hay. */}
      <Box
        className="pc-img"
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          mb: 2,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: product.imagenPortada
            ? 'background.paper'
            : 'color-mix(in srgb, var(--pc-palette-primary-main) 8%, var(--pc-palette-background-paper))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.imagenPortada ? (
          <img
            src={product.imagenPortada}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'transform 420ms cubic-bezier(.23,1,.32,1)',
            }}
            loading="lazy"
          />
        ) : (
          <CategoriaIcon categoria={product.category} sx={{ fontSize: 56, color: 'primary.main', opacity: 0.5 }} />
        )}

        {ultimas && (
          <Typography
            component="span"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              px: 1,
              py: 0.5,
              borderRadius: 99,
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              fontSize: '.6875rem',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            Últimas unidades
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
        <Typography
          component="span"
          sx={{
            fontSize: '.75rem',
            fontWeight: 600,
            lineHeight: 1,
            px: 1.25,
            py: 0.6,
            borderRadius: 99,
            color: 'primary.main',
            bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 10%, transparent)',
          }}
        >
          {formatCategoria(product.category)}
        </Typography>

        {/* `esSerializado` llega del endpoint como la promoción "Único": es una
            unidad con IMEI propio, no un artículo de stock a granel. */}
        {product.promotions?.includes('Único') && (
          <Typography
            component="span"
            className="mono"
            sx={{
              ...muted,
              flex: 'none',
              fontSize: '.6875rem',
              px: 0.75,
              py: 0.35,
              border: 1,
              borderColor: 'divider',
              borderRadius: 99,
              lineHeight: 1,
            }}
          >
            Único
          </Typography>
        )}
      </Box>

      <Typography
        component="h3"
        sx={{
          mt: 0.5,
          fontSize: '1.0625rem',
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: '-.02em',
        }}
      >
        <MuiLink
          component={Link}
          to={`/catalogo/product/${product.id}`}
          underline="none"
          sx={{
            color: 'inherit',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            // Cubre la card entera: un solo destino, un solo elemento enfocable.
            '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit' },
          }}
        >
          {product.name}
        </MuiLink>
      </Typography>

      {discount && (
        <Typography
          className="mono"
          sx={{ ...muted, mt: 1.25, fontSize: '.8125rem', textDecoration: 'line-through' }}
        >
          ${formatCurrency(product.comparePrice)}
        </Typography>
      )}

      <Typography
        sx={{
          ...priceSx(),
          mt: discount ? 0.25 : 2,
          ...(sinStock && { color: 'text.secondary' }),
        }}
      >
        ${formatCurrency(product.price)}
      </Typography>

      <ProductSpecs product={product} denso />

      <Box
        sx={{
          mt: 'auto',
          pt: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        {stockTexto && (
          <Typography
            sx={{
              fontSize: '.8125rem',
              color: sinStock ? 'pc.textMuted' : ultimas ? 'warning.main' : 'text.secondary',
              ...(ultimas && { fontWeight: 600 }),
            }}
          >
            {stockTexto}
          </Typography>
        )}

        {comparable && (
          <Tooltip title={enComparacion ? 'Quitar de la comparación' : compare.isFull ? 'Ya hay 3 productos para comparar' : 'Comparar'}>
            <Box component="span" sx={{ flex: 'none', ml: 'auto' }}>
              <IconButton
                onClick={() => compare.toggle(product.id)}
                disabled={!enComparacion && compare.isFull}
                aria-pressed={enComparacion}
                aria-label={enComparacion ? `Quitar ${product.name} de la comparación` : `Comparar ${product.name}`}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  width: 38,
                  height: 38,
                  border: 1,
                  borderColor: enComparacion ? 'primary.main' : 'divider',
                  borderRadius: '8px',
                  color: enComparacion ? 'primary.contrastText' : 'text.primary',
                  bgcolor: enComparacion ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: enComparacion ? 'primary.dark' : undefined },
                }}
              >
                <CompareArrowsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Tooltip>
        )}

        {cart && (
          <Tooltip title={sinStock ? 'Sin stock' : 'Agregar al carrito'}>
            {/* El span deja que el Tooltip funcione con el botón deshabilitado. */}
            <Box component="span" sx={{ flex: 'none', ml: comparable ? 0 : 'auto' }}>
              <IconButton
                className="pc-add"
                disabled={sinStock}
                onClick={() => cart.addToCart(product)}
                aria-label={sinStock ? `${product.name}, sin stock` : `Agregar ${product.name} al carrito`}
                sx={{
                  // Por encima del ::after del enlace, si no el click cae en la card.
                  position: 'relative',
                  zIndex: 1,
                  width: 38,
                  height: 38,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '8px',
                  color: 'text.primary',
                  transition: 'opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                  '&:active': { transform: 'scale(.94)' },
                  // En puntero fino aparece en hover; en táctil está siempre,
                  // porque no hay hover que lo revele.
                  '@media (hover: hover) and (pointer: fine)': {
                    opacity: 0,
                    '&:focus-visible': { opacity: 1 },
                    '&:hover:not(.Mui-disabled)': {
                      bgcolor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Paper>
  )
}

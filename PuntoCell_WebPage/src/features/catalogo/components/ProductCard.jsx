import { Box, IconButton, Link as MuiLink, Tooltip, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import { Link } from 'react-router-dom'

import { useCart } from '../context/CartContext'
import { useCompare, esComparable } from '../context/CompareContext'
import { formatCurrency } from '../utils/whatsapp'
import { formatCategoria } from '../utils/categorias'
import ProductSpecs from './ProductSpecs'
import CategoriaIcon from './CategoriaIcon'
import './fotoProducto.css'
import './catalogoUi.css'
import { DISPLAY, muted, price as priceSx } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'

// Sombras de la tarjeta flotante: dos capas suaves en reposo, una más amplia al levantarse.
// Se separa del lienzo por sombra y color de superficie, no por borde.
const SOMBRA = {
  claro: '0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.08)',
  claroAlto: '0 4px 24px rgba(0,0,0,.14)',
  oscuro: '0 4px 6px -1px rgba(0,0,0,.45), 0 2px 4px -2px rgba(0,0,0,.45)',
  oscuroAlto: '0 8px 28px rgba(0,0,0,.6)',
}

/**
 * Card única de producto del catálogo (grilla, filas por categoría y relacionados del detalle).
 *
 * Tarjeta flotante: superficie del tema con radio de 28px, una foto con su propio radio de
 * 20px (queda un marco de 8px alrededor, aunque la foto traiga fondo blanco) y la sombra como
 * único separador. El nombre es el enlace real y su ::after cubre la card entera, así todo el
 * bloque es clickeable sin perder foco de teclado ni anidar interactivos. Los botones de
 * comparar y agregar se dibujan por encima de ese ::after y sólo aparecen donde hay su provider.
 */
export default function ProductCard({ product, retraso = 0 }) {
  const cart = useCart()
  const { mode, systemMode } = useColorScheme()
  const oscuro = (mode === 'system' ? systemMode : mode) === 'dark'
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

  const [enteros, decimales] = (() => {
    const t = formatCurrency(product.price)
    const i = t.lastIndexOf(',')
    return i === -1 ? [t, ''] : [t.slice(0, i), t.slice(i)]
  })()

  const stockTexto = sinStock
    ? 'Sin stock'
    : stock === null
      ? null
      : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`

  const sombra = oscuro ? SOMBRA.oscuro : SOMBRA.claro
  const sombraAlta = oscuro ? SOMBRA.oscuroAlto : SOMBRA.claroAlto

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 1,
        borderRadius: '28px',
        bgcolor: 'background.paper',
        boxShadow: sombra,
        // Sin stock: la tarjeta se apaga un poco.
        ...(sinStock && { '& .pc-img': { opacity: 0.55 } }),
        '&:has(a:focus-visible)': {
          outline: '2px solid var(--pc-palette-primary-main)',
          outlineOffset: '2px',
        },
        // El botón de agregar aparece con la tarjeta (sólo puntero fino): sube 4px y se funde.
        '& .pc-add': { translate: '0 0' },
        '@media (hover: hover) and (pointer: fine)': {
          transition: 'transform 240ms cubic-bezier(.23,1,.32,1), box-shadow 240ms cubic-bezier(.23,1,.32,1)',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: sombraAlta },
          '& .pc-add': { translate: '0 4px' },
          '&:hover .pc-add, & .pc-add:focus-visible': { opacity: 1, translate: '0 0' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '@media (hover: hover) and (pointer: fine)': { '&:hover': { transform: 'none' } },
        },
      }}
      // Toda la tarjeta es el anfitrión del efecto de la foto (ver fotoProducto.css).
      className="pc-foto-host pc-card-in"
      style={retraso ? { '--pc-retraso': `${retraso}ms` } : undefined}
    >
      {/* Escenario de la foto. Las fotos traen fondo blanco opaco: con `multiply` el blanco toma
          el color del escenario y el producto queda apoyado en él, no en una caja blanca. */}
      <Box
        className="pc-img"
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '5 / 4',
          borderRadius: '20px',
          overflow: 'hidden',
          background: oscuro
            ? 'radial-gradient(ellipse 80% 75% at 50% 42%, #f4f7f5 0%, #c9dbd1 100%)'
            : 'radial-gradient(ellipse 80% 75% at 50% 42%, #ffffff 0%, #e6eeea 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // El blend va en el grupo que flota (no en la <img>): una <img> con transform en hover pierde el multiply.
          '& .pc-foto__flota': { mixBlendMode: 'multiply' },
        }}
      >
        {product.imagenPortada ? (
          <span className="pc-foto">
            <span className="pc-foto__flota">
              <img className="pc-foto__img" src={product.imagenPortada} alt={product.name} loading="lazy" />
            </span>
            <span className="pc-foto__sombra" aria-hidden="true" />
          </span>
        ) : (
          <CategoriaIcon categoria={product.category} sx={{ fontSize: 56, color: 'primary.main', opacity: 0.5 }} />
        )}

        {ultimas && (
          <Typography
            component="span"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.1,
              py: 0.6,
              borderRadius: '4px 12px 4px 12px',
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              fontSize: '.6875rem',
              fontWeight: 600,
              lineHeight: 1,
              transform: 'rotate(-2deg)',
              boxShadow: '0 6px 14px -8px rgba(0,0,0,.5)',
            }}
          >
            Últimas unidades
          </Typography>
        )}

        {/* `esSerializado` llega del endpoint como la promoción "Único": es una
            unidad con IMEI propio, no un artículo de stock a granel. */}
        {product.promotions?.includes('Único') && (
          <Typography
            component="span"
            className="mono"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontSize: '.6875rem',
              px: 0.9,
              py: 0.5,
              borderRadius: 99,
              lineHeight: 1,
              bgcolor: 'rgba(255,255,255,.82)',
              color: '#1d1b18',
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            }}
          >
            Único
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 1.5, pt: 1.75, pb: 1.25 }}>
        <Typography
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            fontFamily: MONO,
            fontSize: '.6875rem',
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'pc.textMuted',
          }}
        >
          <Box aria-hidden component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
          {formatCategoria(product.category)}
        </Typography>

        <Typography
          component="h3"
          sx={{
            mt: 1,
            fontFamily: DISPLAY,
            fontSize: '1.0625rem',
            fontWeight: 700,
            lineHeight: 1.22,
            letterSpacing: '-.03em',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography className="mono" sx={{ ...muted, fontSize: '.8125rem', textDecoration: 'line-through' }}>
              ${formatCurrency(product.comparePrice)}
            </Typography>
            <Typography
              component="span"
              className="mono"
              sx={{
                px: 0.75,
                py: 0.4,
                borderRadius: 99,
                fontSize: '.6875rem',
                fontWeight: 500,
                lineHeight: 1,
                color: 'primary.main',
                bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
              }}
            >
              -{discount}%
            </Typography>
          </Box>
        )}

        {/* Precio a la izquierda, acciones a la derecha. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mt: discount ? 0.5 : 1.25,
          }}
        >
          <Typography
            sx={{
              ...priceSx(),
              fontSize: '1.625rem',
              ...(sinStock && { color: 'text.secondary' }),
            }}
          >
            ${enteros}
            <Box component="span" sx={{ fontSize: '.55em', opacity: 0.7 }}>
              {decimales}
            </Box>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {comparable && (
              <Tooltip title={enComparacion ? 'Quitar de la comparación' : compare.isFull ? 'Ya hay 3 productos para comparar' : 'Comparar'}>
                <Box component="span" sx={{ flex: 'none' }}>
                  <IconButton
                    onClick={() => compare.toggle(product.id)}
                    disabled={!enComparacion && compare.isFull}
                    aria-pressed={enComparacion}
                    aria-label={enComparacion ? `Quitar ${product.name} de la comparación` : `Comparar ${product.name}`}
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      width: 36,
                      height: 36,
                      border: 1,
                      borderColor: enComparacion ? 'primary.main' : 'divider',
                      borderRadius: 99,
                      color: enComparacion ? 'primary.contrastText' : 'text.primary',
                      bgcolor: enComparacion ? 'primary.main' : 'transparent',
                      transition: 'background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                      '&:active': { transform: 'scale(.94)' },
                      '&:hover': { bgcolor: enComparacion ? 'primary.dark' : undefined },
                    }}
                  >
                    <CompareArrowsIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}

            {cart && (
              <Tooltip title={sinStock ? 'Sin stock' : 'Agregar al carrito'}>
                {/* El span deja que el Tooltip funcione con el botón deshabilitado. */}
                <Box component="span" sx={{ flex: 'none' }}>
                  <IconButton
                    className="pc-add"
                    disabled={sinStock}
                    onClick={() => cart.addToCart(product)}
                    aria-label={sinStock ? `${product.name}, sin stock` : `Agregar ${product.name} al carrito`}
                    sx={{
                      // Por encima del ::after del enlace, si no el click cae en la card.
                      position: 'relative',
                      zIndex: 1,
                      width: 36,
                      height: 36,
                      borderRadius: 99,
                      color: 'primary.contrastText',
                      bgcolor: 'primary.main',
                      boxShadow: '0 4px 14px color-mix(in srgb, var(--pc-palette-primary-main) 38%, transparent)',
                      transition: 'opacity 180ms ease, translate 240ms cubic-bezier(.23,1,.32,1), background-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                      '&:active': { transform: 'scale(.92)' },
                      '&.Mui-disabled': { bgcolor: 'action.disabledBackground', boxShadow: 'none' },
                      // En puntero fino aparece en hover; en táctil está siempre,
                      // porque no hay hover que lo revele.
                      '@media (hover: hover) and (pointer: fine)': {
                        opacity: 0,
                        '&:hover:not(.Mui-disabled)': { bgcolor: 'primary.dark' },
                      },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>

        <ProductSpecs product={product} compacto />

        {stockTexto && (
          <Typography
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.875,
              mt: 'auto',
              pt: 1.5,
              fontSize: '.8125rem',
              color: sinStock ? 'pc.textMuted' : ultimas ? 'warning.main' : 'text.secondary',
              ...(ultimas && { fontWeight: 600 }),
            }}
          >
            <Box
              aria-hidden
              component="span"
              sx={{
                flex: 'none',
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: sinStock ? 'text.disabled' : ultimas ? 'warning.main' : 'primary.main',
              }}
            />
            {stockTexto}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

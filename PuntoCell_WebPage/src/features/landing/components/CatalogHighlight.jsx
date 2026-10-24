import { Box, Typography, useMediaQuery } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Link } from 'react-router-dom'

import CategoriaIcon from '../../catalogo/components/CategoriaIcon'
import ProductCardSkeleton from '../../catalogo/components/ProductCardSkeleton'
import ProductSpecs from '../../catalogo/components/ProductSpecs'
import { useProducts } from '../../catalogo/context/ProductContext'
import { formatCurrency } from '../../catalogo/utils/whatsapp'
import { formatCategoria } from '../../catalogo/utils/categorias'
import AccordionGallery from '../../../components/ui/AccordionGallery'
import { muted, price as priceSx, section, shell } from '../../../components/ui/publicStyles'
import { DISPLAY } from '../landingTokens'

const pastilla = {
  fontSize: '.75rem',
  fontWeight: 600,
  lineHeight: 1,
  px: 1.25,
  py: 0.6,
  borderRadius: 99,
}

/** Lo que se lee con el panel abierto: la misma información que daba la tarjeta del producto. */
function Detalle({ product }) {
  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null
  const ultimas = stock !== null && stock > 0 && stock <= 3
  const descuento =
    product.comparePrice && product.comparePrice > product.price ? product.comparePrice : null
  const stockTexto = stock === null ? null : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`

  return (
    <>
      <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Typography
          component="span"
          sx={{
            ...pastilla,
            color: 'primary.main',
            bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
          }}
        >
          {formatCategoria(product.category)}
        </Typography>
        {product.promotions?.includes('Único') && (
          <Typography
            component="span"
            className="mono"
            sx={{ ...pastilla, ...muted, fontSize: '.6875rem', border: 1, borderColor: 'divider' }}
          >
            Único
          </Typography>
        )}
        {ultimas && (
          <Typography
            component="span"
            sx={{ ...pastilla, fontSize: '.6875rem', bgcolor: 'warning.main', color: 'warning.contrastText' }}
          >
            Últimas unidades
          </Typography>
        )}
      </Box>

      <Typography
        component="span"
        className="ag-hide-vertical"
        sx={{
          display: '-webkit-box',
          mt: 1.25,
          fontSize: '1.1875rem',
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: '-.02em',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {product.name}
      </Typography>

      {descuento && (
        <Typography component="span" className="mono" sx={{ ...muted, display: 'block', mt: 1, fontSize: '.8125rem', textDecoration: 'line-through' }}>
          ${formatCurrency(descuento)}
        </Typography>
      )}
      <Typography component="span" sx={{ ...priceSx(), display: 'block', mt: descuento ? 0.25 : 1.5 }}>
        ${formatCurrency(product.price)}
      </Typography>

      <ProductSpecs product={product} denso />

      {stockTexto && (
        <Typography
          component="span"
          sx={{
            display: 'block',
            mt: 1.5,
            fontSize: '.8125rem',
            color: ultimas ? 'warning.main' : 'text.secondary',
            ...(ultimas && { fontWeight: 600 }),
          }}
        >
          {stockTexto}
        </Typography>
      )}
    </>
  )
}

function aItem(product) {
  const stock = Number(product.stock)
  return {
    key: product.id,
    to: `/catalogo/product/${product.id}`,
    image: product.imagenPortada,
    fallback: <CategoriaIcon categoria={product.category} />,
    tag: product.name,
    ariaLabel: `${product.name}, ${formatCategoria(product.category)}, $${formatCurrency(product.price)}${
      Number.isFinite(stock) ? `, ${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}` : ''
    }`,
    content: <Detalle product={product} />,
  }
}

export default function CatalogHighlight() {
  const { products, loading } = useProducts()
  // Lo que se muestra acá es "lo que hay en el local ahora", no una selección
  // editorial: el flag `featured` del contexto era literalmente stock > 0.
  const disponibles = products.filter((p) => p.stock > 0).slice(0, 4)

  const angosta = useMediaQuery('(max-width:700px)')
  // Sin mouse (celular, tablet) no hay hover: el panel se abre con el toque.
  const conHover = useMediaQuery('(hover: hover) and (pointer: fine)')

  if (!loading && disponibles.length === 0) return null

  return (
    <Box component="section" id="disponibles" sx={section(true)}>
      <Box sx={shell}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              sx={{ fontSize: '.8125rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'primary.main' }}
            >
              En el mostrador
            </Typography>
            <Typography
              component="h2"
              sx={{
                mt: 1.5,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                lineHeight: 1,
                letterSpacing: '-.04em',
              }}
            >
              Disponibles ahora
            </Typography>
          </Box>

          {/* La flecha que avanza 3px es la única coquetería de la página, y
              sólo donde hay puntero fino. */}
          <Box
            component={Link}
            to="/catalogo"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '.9375rem',
              lineHeight: 1,
              '& svg': {
                fontSize: 16,
                transition: 'transform 220ms cubic-bezier(.23,1,.32,1)',
              },
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover svg': { transform: 'translateX(3px)' },
              },
            }}
          >
            Ver todo el catálogo
            <ArrowForwardIcon />
          </Box>
        </Box>

        <Box sx={{ mt: 'clamp(2.5rem, 4.5vw, 3.5rem)' }}>
          {loading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 'clamp(1rem, 1.8vw, 1.5rem)',
              }}
            >
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </Box>
          ) : (
            <AccordionGallery
              label="Productos disponibles ahora"
              variant="card"
              items={disponibles.map(aItem)}
              defaultIndex={0}
              orientation={angosta ? 'vertical' : 'horizontal'}
              height={angosta ? 720 : 540}
              trigger={conHover ? 'hover' : 'click'}
              expandRatio={0.5}
              tilt={6}
              grayscale
              accentColor="var(--pc-palette-primary-main)"
              overlayColor="var(--pc-palette-background-paper)"
              textColor="var(--pc-palette-text-primary)"
              radius={20}
              gap={12}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

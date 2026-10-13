import { Box, Button, Paper, Skeleton, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { Link } from 'react-router-dom'

import { STORE_CONFIG } from '../../catalogo/config/store'
import { useProducts } from '../../catalogo/context/ProductContext'
import ProductSpecs from '../../catalogo/components/ProductSpecs'
import { formatCategoria } from '../../catalogo/utils/categorias'
import { formatCurrency } from '../../catalogo/utils/whatsapp'
import { btn, enter, muted, price, shell } from '../../../components/ui/publicStyles'

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`

// El panel ocupa exactamente el lugar que tendría una fotografía, porque no hay
// fotografía. Misma geometría para el esqueleto y para el producto cargado: si
// no, el layout salta cuando termina la carga.
const PANEL = { p: 'clamp(1.75rem, 3.5vw, 2.75rem)', borderRadius: 2 }

function PanelSkeleton() {
  return (
    <Paper sx={PANEL}>
      <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: 250, mb: 3, borderRadius: 1 }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '32%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)', mt: 1, width: '74%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', mt: 3, width: '50%' }} />

      <Box sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 1 }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.9375rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.9375rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.9375rem' }} />
      </Box>

      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.9375rem', width: '58%', mt: 3.5, pt: 2.5 }} />
    </Paper>
  )
}

function PanelProducto({ product }) {
  const stock = Number(product.stock)
  // Mismo umbral que ProductCard: tres o menos ya es "apurate".
  const pocas = stock <= 3
  const unidades = stock === 1 ? '1 unidad' : `${stock} unidades`

  return (
    <Paper sx={{ ...PANEL, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Typography
        component="span"
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          px: 1.25,
          py: 0.6,
          borderRadius: 99,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontSize: '.75rem',
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        Destacado
      </Typography>
      {product.imagenPortada && (
        <Box
          sx={{
            width: '100%',
            height: 250,
            mb: 3,
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={product.imagenPortada}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            loading="lazy"
          />
        </Box>
      )}

      <Typography sx={{ ...muted, fontSize: '.8125rem' }}>
        {formatCategoria(product.category)}
      </Typography>

      <Typography component="h2" sx={{ typography: 'd2', mt: 1 }}>
        {product.name}
      </Typography>

      <Typography sx={{ ...price(true), mt: 3 }}>
        ${formatCurrency(product.price)}
      </Typography>

      <ProductSpecs product={product} />

      <Typography
        sx={{
          mt: 3.5,
          pt: 2.5,
          borderTop: 1,
          borderColor: 'divider',
          fontSize: '.9375rem',
          ...(pocas && { color: 'warning.main' }),
        }}
      >
        <Box component="strong" sx={{ fontWeight: 600 }}>{unidades}</Box>
        {stock === 1 ? ' disponible' : ' disponibles'}
      </Typography>
    </Paper>
  )
}

export default function Hero() {
  const { products, loading } = useProducts()

  // El destacado sale del inventario real: el más caro que tenga stock. Antes era
  // el primero del array y la vidriera terminaba mostrando una funda de $3.024.
  // Sin nada que mostrar, el titular se queda con el ancho completo.
  const destacado = products
    .filter((p) => p.stock > 0)
    .reduce((mejor, p) => (!mejor || p.price > mejor.price ? p : mejor), null)
  const hayPanel = loading || Boolean(destacado)

  return (
    <Box
      component="section"
      sx={{
        pt: 'clamp(3.5rem, 7vw, 6rem)',
        pb: 'clamp(4rem, 8vw, 7rem)',
        // Luz verde suave en las esquinas: da ambiente sin competir con el contenido.
        background:
          'radial-gradient(ellipse 60% 70% at 100% 0%, color-mix(in srgb, var(--pc-palette-primary-main) 14%, transparent), transparent 70%),' +
          'radial-gradient(ellipse 45% 55% at 0% 100%, color-mix(in srgb, var(--pc-palette-primary-main) 8%, transparent), transparent 70%)',
      }}
    >
      <Box
        sx={{
          ...shell,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'clamp(2.5rem, 5vw, 4.5rem) clamp(1.5rem, 3vw, 3rem)',
          alignItems: 'center',
        }}
      >
        <Box sx={{ gridColumn: hayPanel ? { xs: '1 / -1', md: '1 / 6' } : '1 / -1' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              mb: 3,
              px: 1.5,
              py: 0.75,
              borderRadius: 99,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              fontSize: '.8125rem',
              fontWeight: 500,
              ...enter(0),
            }}
          >
            <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
            Punto Cell · La Calera, Córdoba
          </Box>

          <Typography component="h1" sx={{ typography: 'd1', ...enter(0) }}>
            Celulares, repuestos y servicio técnico en La Calera.
          </Typography>

          <Typography
            sx={{
              typography: 'publicBody',
              mt: 3,
              maxWidth: '46ch',
              color: 'text.secondary',
              ...enter(1),
            }}
          >
            El catálogo se actualiza con el inventario del mostrador. El precio que ves
            es el precio, y si figura, está.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4.5, ...enter(2) }}>
            <Button
              component={Link}
              to="/catalogo"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={btn}
            >
              Ver el catálogo
            </Button>
            <Button
              variant="outlined"
              href={whatsappUrl}
              target="_blank"
              rel="noopener"
              startIcon={<WhatsAppIcon />}
              sx={btn}
            >
              Escribinos
            </Button>
          </Box>
        </Box>

        {hayPanel && (
          // La entrada va en la columna, no en el panel: así el cambio de
          // esqueleto a producto no vuelve a disparar el fundido.
          <Box sx={{ gridColumn: { xs: '1 / -1', md: '6 / -1' }, ...enter(2) }}>
            {loading ? <PanelSkeleton /> : <PanelProducto product={destacado} />}
          </Box>
        )}
      </Box>
    </Box>
  )
}

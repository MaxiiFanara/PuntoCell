import { Box, Button, Paper, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { Link } from 'react-router-dom'

import { STORE_CONFIG } from '../../catalogo/config/store'
import CategoriaIcon from '../../catalogo/components/CategoriaIcon'
import ProductMedia from '../../catalogo/components/ProductMedia'
import { btn, enter, muted, shell } from '../../../components/ui/publicStyles'

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`

const PANEL = { p: 'clamp(1.75rem, 3.5vw, 2.75rem)', borderRadius: 2 }

const CONSULTA_URL = `${whatsappUrl}?text=${encodeURIComponent('Hola! Quiero consultar por el iPhone 18 Pro Max')}`

// Tarjeta fija: sin precio ni stock, porque no salen del inventario.
function PanelDestacado() {
  return (
    <Paper sx={{ ...PANEL, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Typography
        component="span"
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1,
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

      <Box sx={{ position: 'relative', width: '100%', height: 360, mb: 3 }}>
        <ProductMedia
          src="/models/iphone-18-pro-max.glb"
          alt="Modelo 3D del iPhone 18 Pro Max"
          interactive
          orientation="90deg 0deg 0deg"
          fallback={<CategoriaIcon categoria="Celulares" sx={{ fontSize: 96 }} />}
        />
      </Box>

      <Typography sx={{ ...muted, fontSize: '.8125rem' }}>Celulares</Typography>

      <Typography component="h2" sx={{ typography: 'd2', mt: 1 }}>
        iPhone 18 Pro Max
      </Typography>

      <Button
        variant="contained"
        href={CONSULTA_URL}
        target="_blank"
        rel="noopener"
        startIcon={<WhatsAppIcon />}
        sx={{ ...btn, mt: 3, alignSelf: 'flex-start' }}
      >
        Consultar precio
      </Button>
    </Paper>
  )
}

export default function Hero() {
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
        <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / 6' } }}>
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

        <Box sx={{ gridColumn: { xs: '1 / -1', md: '6 / -1' }, ...enter(2) }}>
          <PanelDestacado />
        </Box>
      </Box>
    </Box>
  )
}

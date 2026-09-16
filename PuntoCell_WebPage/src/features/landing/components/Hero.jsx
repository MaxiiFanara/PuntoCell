import { Box, Button, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { STORE_CONFIG } from '../../catalogo/config/store';

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`;

export default function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 2.5,
        py: { xs: 8, md: 12 },
        bgcolor: 'background.default',
      }}
    >
      {/* Resplandor de marca. Estático: no compite con el contenido ni necesita
          guard de prefers-reduced-motion. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -220,
          right: -160,
          width: 620,
          height: 620,
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(var(--pc-palette-primary-mainChannel) / 0.10) 0%, transparent 70%)',
        }}
      />

      <Box sx={{ position: 'relative', maxWidth: 900, mx: 'auto', textAlign: 'center' }}>
        <Box sx={{ typography: 'eyebrow', color: 'primary.main', mb: 2 }}>
          La Calera · Córdoba
        </Box>

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4rem' },
            fontWeight: 600,
            letterSpacing: '-.04em',
            lineHeight: 1.05,
            textWrap: 'balance',
            color: 'text.primary',
          }}
        >
          Tu próximo equipo,{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>al mejor precio</Box>
        </Typography>

        <Typography
          sx={{
            maxWidth: 620,
            mx: 'auto',
            mt: 3,
            fontSize: { xs: '1rem', md: '1.15rem' },
            lineHeight: 1.6,
            color: 'text.secondary',
          }}
        >
          Los últimos modelos, repuestos originales y el servicio técnico más confiable
          para tu dispositivo.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 5, flexWrap: 'wrap' }}>
          <Button variant="contained" size="large" href="/catalogo"
            startIcon={<ShoppingBagIcon sx={{ fontSize: '18px !important' }} />}>
            Ver el catálogo
          </Button>
          <Button variant="outlined" size="large" href={whatsappUrl} target="_blank" rel="noopener"
            startIcon={<WhatsAppIcon sx={{ fontSize: '18px !important' }} />}>
            Escribinos
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

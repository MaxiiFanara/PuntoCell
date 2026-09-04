import { Box, Button, Paper, Typography } from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import StatusPill from '../../../components/ui/StatusPill';

// Vidriera de ejemplo hasta que se enganche al catálogo real (/api/catalogo).
const DESTACADOS = [
  { name: 'iPhone 15 Pro Max', spec: '256 GB', price: 'U$S 1.199', estado: 'Nuevo' },
  { name: 'iPhone 14 Pro',     spec: '128 GB', price: 'U$S 899',   estado: 'Seminuevo' },
  { name: 'AirPods Pro',       spec: '2da gen', price: 'U$S 249',  estado: 'Nuevo' },
  { name: 'Apple Watch S9',    spec: '45 mm',  price: 'U$S 399',   estado: 'Nuevo' },
];

export default function CatalogHighlight() {
  return (
    <Box component="section" sx={{ px: 2.5, py: { xs: 8, md: 12 }, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>

        <Box sx={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 2, mb: { xs: 3.5, md: 5 }, flexWrap: 'wrap',
        }}>
          <Box>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Vidriera</Box>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 600, letterSpacing: '-.03em' }}>
              Equipos destacados
            </Typography>
            <Typography sx={{ mt: 1, fontSize: '1rem', color: 'text.secondary' }}>
              Los modelos más buscados, con entrega inmediata.
            </Typography>
          </Box>
          <Button href="/catalogo" endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}>
            Ver todo el catálogo
          </Button>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {DESTACADOS.map((p) => (
            <Paper
              key={p.name}
              sx={{
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transition: 'border-color .2s',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              {/* Marcador de foto. Antes venía de placehold.co: la vidriera
                  dependía de un servicio externo para renderizar. */}
              <Box sx={{
                position: 'relative', height: 190,
                bgcolor: 'pc.surfaceMuted',
                borderBottom: 1, borderColor: 'pc.dividerSoft',
                display: 'grid', placeItems: 'center',
                color: 'text.disabled',
              }}>
                <SmartphoneIcon sx={{ fontSize: 44, opacity: .45 }} />
                <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                  <StatusPill tone={p.estado === 'Nuevo' ? 'ok' : 'flat'} label={p.estado} />
                </Box>
              </Box>

              <Box sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{p.spec}</Box>
                <Typography component="h3" sx={{ fontWeight: 600, fontSize: '.95rem', letterSpacing: '-.015em' }}>
                  {p.name}
                </Typography>
                <Typography className="mono" sx={{ mt: 0.5, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-.02em', color: 'primary.main' }}>
                  {p.price}
                </Typography>
                <Button href="/catalogo" variant="outlined" fullWidth sx={{ mt: 1.75 }}>
                  Ver detalle
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

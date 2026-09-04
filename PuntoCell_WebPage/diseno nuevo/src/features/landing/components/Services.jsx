import { Box, Paper, Typography } from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import HandymanIcon from '@mui/icons-material/Handyman';
import HeadphonesIcon from '@mui/icons-material/Headphones';

const SERVICIOS = [
  {
    title: 'Equipos',
    description: 'Nuevos y seminuevos verificados, con garantía del local y batería declarada.',
    icon: SmartphoneIcon,
  },
  {
    title: 'Servicio técnico',
    description: 'Reparaciones en el día. Cambio de batería, módulos y diagnóstico con repuestos de calidad.',
    icon: HandymanIcon,
  },
  {
    title: 'Accesorios',
    description: 'Fundas, vidrios templados, cargadores originales y auriculares para cuidar tu equipo.',
    icon: HeadphonesIcon,
  },
];

export default function Services() {
  return (
    <Box component="section" sx={{ px: 2.5, py: { xs: 8, md: 12 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>

        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Qué hacemos</Box>
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 600,
              letterSpacing: '-.03em',
              textWrap: 'balance',
            }}
          >
            Todo para tu dispositivo en un solo lugar
          </Typography>
          <Typography sx={{ maxWidth: 560, mx: 'auto', mt: 1.5, fontSize: '1rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Calidad, confianza y atención personalizada.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {SERVICIOS.map((servicio) => (
            <Paper
              key={servicio.title}
              sx={{
                p: 3.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                transition: 'border-color .2s',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box sx={{
                width: 44, height: 44, borderRadius: '12px',
                bgcolor: 'pc.accentSoft', color: 'primary.main',
                display: 'grid', placeItems: 'center',
              }}>
                <servicio.icon sx={{ fontSize: 22 }} />
              </Box>
              <Typography component="h3" sx={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-.02em' }}>
                {servicio.title}
              </Typography>
              <Typography sx={{ fontSize: '.9rem', lineHeight: 1.6, color: 'text.secondary' }}>
                {servicio.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

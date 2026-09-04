import { Box, IconButton, Paper, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';

const MIEMBROS = [
  { name: 'Simón', role: 'Desarrollador Full-Stack', inicial: 'S', linkedin: '#', github: '#' },
  { name: '[Nombre del Compañero]', role: 'Analista Funcional & QA', inicial: 'C', linkedin: '#', github: '#' },
];

export default function Team() {
  return (
    <Box component="section" sx={{ px: 2.5, py: { xs: 8, md: 12 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 880, mx: 'auto' }}>

        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Proyecto final</Box>
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 600, letterSpacing: '-.03em', textWrap: 'balance' }}>
            El equipo detrás del código
          </Typography>
          <Typography sx={{ maxWidth: 620, mx: 'auto', mt: 1.5, fontSize: '1rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Este ecosistema integra una vitrina comercial conectada en tiempo real a un
            sistema de administración integral.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {MIEMBROS.map((m) => (
            <Paper key={m.name} sx={{ p: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%',
                bgcolor: 'pc.accentSoft', color: 'primary.main',
                display: 'grid', placeItems: 'center',
                fontSize: '1.75rem', fontWeight: 700,
              }}>
                {m.inicial}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-.02em' }}>{m.name}</Typography>
                <Typography sx={{ fontSize: '.84rem', fontWeight: 500, color: 'primary.main' }}>{m.role}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton component="a" href={m.linkedin} target="_blank" rel="noopener" aria-label={`LinkedIn de ${m.name}`}>
                  <LinkedInIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton component="a" href={m.github} target="_blank" rel="noopener" aria-label={`GitHub de ${m.name}`}>
                  <GitHubIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

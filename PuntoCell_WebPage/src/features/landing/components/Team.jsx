import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

const MIEMBROS = [
  {
    name: 'Natan Yona',
    role: 'Desarrollador Fullstack',
    github: 'https://github.com/NatanYona',
    linkedin: 'https://www.linkedin.com/in/natan-yona-0961a7141/',
  },
  {
    name: 'Maximiliano Fanara',
    role: 'Desarrollador Fullstack',
    github: 'https://github.com/MaxiiFanara',
    linkedin: 'https://www.linkedin.com/in/maximilianofanara/',
  },
  {
    name: 'Juan Pablo Guerrini',
    role: 'Analista de Sistemas',
    github: 'https://github.com/jpguerrini',
    linkedin: 'https://www.linkedin.com/in/juan-pablo-guerrini-7a641b284/',
  },
  {
    name: 'Juan Pablo Imoberdorf',
    role: 'Desarrollador Fullstack',
    github: 'https://github.com/Juan-imo21',
    linkedin: 'https://www.linkedin.com/in/juan-pablo-imoberdorf-b4315a278/',
  },
];

// Iniciales del nombre y del apellido: los dos Juan Pablo quedan distinguibles
// (JG y JI) sin tener que mantener el dato a mano en cada entrada.
const iniciales = (nombre) => {
  const partes = nombre.trim().split(/\s+/);
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const avatar = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  fontSize: '1.5rem',
  fontWeight: 700,
  letterSpacing: '.01em',
};

const tarjeta = {
  p: 3,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1.25,
  textAlign: 'center',
  height: '100%',
};

// 5 integrantes sin celdas vacías en ninguna medida: en md son 6 columnas con
// 3 arriba (span 2) y 2 abajo (span 3); en sm son 2 columnas y el quinto ocupa
// la fila entera, si no queda solo con un hueco al lado.
const ULTIMO = 4;
const columna = (i) => ({
  sm: i === ULTIMO ? 'span 2' : 'span 1',
  md: i < 3 ? 'span 2' : 'span 3',
});

export default function Team() {
  return (
    <Box component="section" sx={{ px: 2.5, py: { xs: 6, md: 9 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>

        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 600, letterSpacing: '-.03em', textWrap: 'balance' }}>
            El equipo detrás del código
          </Typography>
          <Typography sx={{ maxWidth: 620, mx: 'auto', mt: 1.5, fontSize: '1rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Este ecosistema integra una vitrina comercial conectada en tiempo real a un
            sistema de administración integral.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
            gap: 2,
          }}
        >
          {MIEMBROS.map((m, i) => (
            <Box key={m.name} sx={{ gridColumn: columna(i) }}>
              <Paper sx={tarjeta}>
                <Box sx={{ ...avatar, bgcolor: 'pc.accentSoft', color: 'primary.main' }}>
                  {iniciales(m.name)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '1.02rem', letterSpacing: '-.02em' }}>
                    {m.name}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontSize: '.84rem', fontWeight: 500, color: 'primary.main' }}>
                    {m.role}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto' }}>
                  <Tooltip title={`LinkedIn de ${m.name}`}>
                    <IconButton
                      component="a"
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${m.name}`}
                    >
                      <LinkedInIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={`GitHub de ${m.name}`}>
                    <IconButton
                      component="a"
                      href={m.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`GitHub de ${m.name}`}
                    >
                      <GitHubIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Box>
          ))}

          {/* Quinto lugar, todavía sin asignar. Va con borde punteado y sin
              enlaces: se lee como un espacio a completar, no como una persona. */}
          <Box sx={{ gridColumn: columna(MIEMBROS.length) }}>
            <Paper
              sx={{
                ...tarjeta,
                justifyContent: 'center',
                borderStyle: 'dashed',
                boxShadow: 'none',
                bgcolor: 'transparent',
              }}
            >
              <Box sx={{ ...avatar, bgcolor: 'pc.surfaceMuted', color: 'text.disabled' }}>
                <PersonAddAlt1Icon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '1.02rem', letterSpacing: '-.02em', color: 'text.secondary' }}>
                  Quinto integrante
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: '.84rem', fontWeight: 500, color: 'text.disabled' }}>
                  Lugar por asignar
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

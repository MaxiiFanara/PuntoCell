import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import GitHubIcon from '@mui/icons-material/GitHub'

import { section, shell } from '../../../components/ui/publicStyles'

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
  // Quinto lugar, todavía sin asignar. Sin enlaces y con el nombre atenuado: se
  // lee como un renglón a completar, no como una persona.
  { name: 'Quinto integrante', role: 'Lugar por asignar' },
]

const enlace = {
  width: 36,
  height: 36,
  border: 1,
  borderColor: 'divider',
  borderRadius: '8px',
  color: 'text.secondary',
  transition: 'color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
  '&:active': { transform: 'scale(.94)' },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': { color: 'text.primary', borderColor: 'text.disabled' },
  },
}

/**
 * Índice del equipo: filas con filete, no tarjetas con avatar de iniciales.
 *
 * Es el bloque más subordinado de la página y cierra el sitio sin competir con
 * el producto, así que el título va en la escala chica del display.
 */
export default function Team() {
  return (
    <Box component="section" sx={section(true)}>
      <Box sx={shell}>
        <Typography component="h2" sx={{ typography: 'd3' }}>
          El equipo detrás del código
        </Typography>
        <Typography
          sx={{ mt: 1.5, maxWidth: '46ch', fontSize: '.875rem', lineHeight: 1.5, color: 'text.secondary' }}
        >
          Este ecosistema integra una vitrina comercial conectada en tiempo real a un
          sistema de administración integral.
        </Typography>

        <Box sx={{ mt: 5, borderTop: 1, borderColor: 'divider' }}>
          {MIEMBROS.map((m) => (
            <Box
              key={m.name}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(0, 26ch) minmax(0, 1fr) auto' },
                alignItems: 'center',
                gap: '.2rem 1.5rem',
                py: '1.15rem',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontSize: '1rem',
                  letterSpacing: '-.02em',
                  ...(m.linkedin
                    ? { fontWeight: 600 }
                    : { fontWeight: 500, color: 'text.secondary' }),
                }}
              >
                {m.name}
              </Typography>

              <Typography sx={{ fontSize: '.875rem', color: 'text.secondary' }}>
                {m.role}
              </Typography>

              {m.linkedin && (
                // En angosto los enlaces ocupan la segunda columna a lo alto de
                // las dos filas; en ancho son la tercera columna de la fila.
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    gridColumn: { xs: 2, sm: 'auto' },
                    gridRow: { xs: '1 / span 2', sm: 'auto' },
                  }}
                >
                  <Tooltip title={`LinkedIn de ${m.name}`}>
                    <IconButton
                      component="a"
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${m.name}`}
                      sx={enlace}
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
                      sx={enlace}
                    >
                      <GitHubIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

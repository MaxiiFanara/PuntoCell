import { Box, Link as MuiLink, Typography } from '@mui/material'

const MIEMBROS = [
  { name: 'Maximiliano Fanara', linkedin: 'https://www.linkedin.com/in/maximilianofanara/' },
  { name: 'Juan Pablo Guerrini', linkedin: 'https://www.linkedin.com/in/juan-pablo-guerrini-7a641b284/' },
  { name: 'Juan Pablo Imoberdorf', linkedin: 'https://www.linkedin.com/in/juan-pablo-imoberdorf-b4315a278/' },
  { name: 'Simon Sclarandi', linkedin: 'https://www.linkedin.com/in/simon-sclarandi/' },
  { name: 'Natan Yona', linkedin: 'https://www.linkedin.com/in/natan-yona-0961a7141/' },
]

/**
 * Créditos del equipo de desarrollo: una línea discreta al pie del sitio, en lugar
 * de una sección propia en la landing.
 */
export default function Team() {
  return (
    <Typography
      component="p"
      sx={{ mt: 2, fontSize: '.8125rem', lineHeight: 1.8, color: 'pc.textMuted' }}
    >
      Desarrollado por{' '}
      {MIEMBROS.map((m, i) => (
        <Box component="span" key={m.name}>
          <MuiLink
            href={m.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ color: 'text.secondary' }}
          >
            {m.name}
          </MuiLink>
          {i < MIEMBROS.length - 2 ? ', ' : i === MIEMBROS.length - 2 ? ' y ' : ''}
        </Box>
      ))}
    </Typography>
  )
}

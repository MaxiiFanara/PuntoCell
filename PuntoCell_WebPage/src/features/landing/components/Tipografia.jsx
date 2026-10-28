import { Box, Typography } from '@mui/material'

import { DISPLAY, MENTA, MONO, SERIF } from '../landingTokens'

/** Palabra en serif itálica: el contrapunto editorial de los títulos. */
export function Acento({ children, color }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: '1.06em',
        letterSpacing: '-.02em',
        ...(color && { color }),
      }}
    >
      {children}
    </Box>
  )
}

/** Etiqueta de sección en mono con índice: `(01) El local`. */
export function Eyebrow({ n, children, claro = false }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO,
        fontSize: '.8125rem',
        fontWeight: 500,
        letterSpacing: '.02em',
        color: claro ? 'rgba(4,18,13,.62)' : 'rgba(255,255,255,.62)',
      }}
    >
      <Box component="span" sx={{ color: claro ? '#0d5240' : MENTA, mr: 1 }}>
        ({n})
      </Box>
      {children}
    </Typography>
  )
}

/** Título de sección. Hereda el color de la sección (oscura o crema). */
export function Titulo({ id, children, sx }) {
  return (
    <Typography
      id={id}
      component="h2"
      sx={{
        mt: 1.5,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)',
        lineHeight: 0.98,
        letterSpacing: '-.04em',
        ...sx,
      }}
    >
      {children}
    </Typography>
  )
}

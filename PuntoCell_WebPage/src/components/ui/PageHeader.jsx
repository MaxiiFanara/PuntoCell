import { Box, Typography } from '@mui/material'

/**
 * Encabezado de pantalla del mockup: eyebrow + título + línea de contexto,
 * con la acción principal alineada a la derecha.
 */
export default function PageHeader({ eyebrow, title, meta, action, mono, sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2.25,
        flexWrap: 'wrap',
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{eyebrow}</Box>
        )}
        <Typography
          variant="h4"
          component="h1"
          className={mono ? 'mono' : undefined}
          sx={{ mt: '2px' }}
        >
          {title}
        </Typography>
        {meta && (
          <Typography sx={{ mt: '1px', fontSize: '.78rem', color: 'text.secondary' }}>
            {meta}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  )
}

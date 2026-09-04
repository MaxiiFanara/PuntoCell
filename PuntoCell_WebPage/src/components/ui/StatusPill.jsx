import { Box } from '@mui/material'

// tone → [fondo, texto]. Todo sale del tema, ningún hex acá.
const TONES = {
  ok:      ['success.light', 'success.main'],
  due:     ['warning.light', 'warning.main'],
  late:    ['error.light',   'error.main'],
  flat:    ['pc.accentSoft', 'primary.main'],
  neutral: ['pc.surfaceMuted', 'text.secondary'],
}

/**
 * Pill de estado del mockup: 23px de alto, punto de color a la izquierda.
 * `meta` es el detalle chico al lado del label (ej. "2/6" en una cuota).
 * `flat` es el único tono sin punto — se usa para estados sin urgencia.
 */
export default function StatusPill({ tone = 'neutral', label, meta, dot, sx }) {
  const [bg, fg] = TONES[tone] || TONES.neutral
  const showDot = dot ?? tone !== 'flat'

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: 23,
        px: '10px',
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontSize: '.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {showDot && (
        <Box
          component="span"
          sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor', flex: 'none' }}
        />
      )}
      {label}
      {meta && (
        <Box component="span" sx={{ fontWeight: 500, opacity: 0.8 }}>
          {meta}
        </Box>
      )}
    </Box>
  )
}

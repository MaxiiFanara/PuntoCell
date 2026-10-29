import { Box, Paper, Skeleton } from '@mui/material'

// El SVG del sparkline necesita un color CSS real, no un token de sx.
const TONE_VAR = {
  accent: 'var(--pc-palette-primary-main)',
  ok:     'var(--pc-palette-success-main)',
  warn:   'var(--pc-palette-warning-main)',
  error:  'var(--pc-palette-error-main)',
  mute:   'var(--pc-palette-text-disabled)',
}

const W = 70
const H = 24

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = W / (points.length - 1)

  const coords = points.map((v, i) => [
    i * step,
    H - 3 - ((v - min) / span) * (H - 6),
  ])
  const line = coords.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
  const [lastX, lastY] = coords[coords.length - 1]

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
      <path d={`M ${line} L ${W} ${H} L 0 ${H} Z`} fill={color} opacity=".1" />
      <path d={`M ${line}`} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.3" fill={color} />
    </svg>
  )
}

/**
 * KPI del mockup: barra de color a la izquierda, valor grande, referencia en
 * dólares abajo y sparkline opcional a la derecha.
 * `badge` reemplaza al delta cuando hace falta un estado en vez de una variación
 * (ej. "1 vencida" en Por cobrar).
 */
export default function KpiCard({
  eyebrow,
  value,
  sub,
  tone = 'accent',
  delta,
  badge,
  spark,
  loading,
  sx,
}) {
  const color = TONE_VAR[tone] || TONE_VAR.accent

  return (
    <Paper
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: '13px 15px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.875,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: color,
        },
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{eyebrow}</Box>
        {badge}
        {!badge && delta && (
          <Box
            sx={{
              fontSize: '.72rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: delta.dir === 'down' ? 'error.main' : 'success.main',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d={delta.dir === 'down' ? 'm5 9 7 7 7-7' : 'm5 15 7-7 7 7'} />
            </svg>
            {delta.value}
          </Box>
        )}
      </Box>

      {loading ? (
        <Skeleton variant="text" width={150} height={32} />
      ) : (
        <Box
          className="num"
          sx={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.05 }}
        >
          {value}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.25 }}>
        <Box className="num" sx={{ fontSize: '.72rem', color: 'text.disabled' }}>
          {loading ? <Skeleton variant="text" width={90} /> : sub}
        </Box>
        <Sparkline points={spark} color={color} />
      </Box>
    </Paper>
  )
}

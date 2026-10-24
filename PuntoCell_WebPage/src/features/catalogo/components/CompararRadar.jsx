import { Box, Typography } from '@mui/material'
import { RadarChart } from '@mui/x-charts/RadarChart'

import { armarRadar, COLORES_SERIES } from '../utils/metricasComparador'
import { DISPLAY, muted } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'
import Aparece from './Aparece'

/**
 * Radar de los equipos elegidos sobre los datos que se pueden medir (batería,
 * pantalla, memoria, cámara). Cada eje va de 0 a su propio máximo, así que lo
 * que importa es qué tan lejos del centro llega cada equipo, no la forma.
 * Si no hay datos suficientes en todos los equipos, no se dibuja nada.
 */
export default function CompararRadar({ productos }) {
  const radar = armarRadar(productos)
  if (!radar) return null

  return (
    <Aparece
      component="section"
      aria-label="Gráfico comparativo"
      sx={{
        mb: 6,
        p: { xs: 2.5, md: 4 },
        borderRadius: '28px',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.08)',
      }}
    >
      <Typography sx={{ fontFamily: MONO, fontSize: '.8125rem', fontWeight: 500, color: 'pc.textMuted' }}>
        <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>(01)</Box>
        Vista general
      </Typography>
      <Typography component="h2" sx={{ mt: 1, fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-.04em', lineHeight: 1.05 }}>
        Quién llega más lejos
      </Typography>
      <Typography sx={{ ...muted, fontSize: '.875rem', mt: 1, mb: 1 }}>
        Cuanto más lejos del centro, mejor en ese aspecto. Pasá el cursor para ver los valores.
      </Typography>
      <Aparece clase="cmp-radar" demora={120}>
        <RadarChart height={380} colors={COLORES_SERIES} series={radar.series} radar={{ metrics: radar.metrics }} />
      </Aparece>
    </Aparece>
  )
}

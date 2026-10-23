import { Box, Typography } from '@mui/material'
import { RadarChart } from '@mui/x-charts/RadarChart'

import { armarRadar } from '../utils/metricasComparador'
import { muted } from '../../../components/ui/publicStyles'

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
    <Box component="section" aria-label="Gráfico comparativo" sx={{ mb: 5 }}>
      <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-.02em' }}>
        Vista general
      </Typography>
      <Typography sx={{ ...muted, fontSize: '.8125rem', mb: 1 }}>
        Cuanto más lejos del centro, mejor en ese aspecto. Pasá el cursor para ver los valores.
      </Typography>
      <RadarChart height={380} series={radar.series} radar={{ metrics: radar.metrics }} />
    </Box>
  )
}

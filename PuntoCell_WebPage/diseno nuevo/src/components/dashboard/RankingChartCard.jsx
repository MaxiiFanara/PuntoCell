import { useState } from 'react'
import { Box, Paper, Typography, Skeleton, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material'
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft'
import BarChartIcon from '@mui/icons-material/BarChart'
import PieChartIcon from '@mui/icons-material/PieChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'

// @mui/x-charts no lee los tokens custom del tema (palette.pc). Las CSS
// variables que el tema publica sí son reactivas a claro/oscuro — mismo
// patrón que TONE_VAR en components/ui/KpiCard.jsx.
const TONE_VAR = {
  accent: 'var(--pc-palette-primary-main)',
  warn:   'var(--pc-palette-warning-main)',
  error:  'var(--pc-palette-error-main)',
  mute:   'var(--pc-palette-text-disabled)',
}

const AXIS_SX = {
  '& .MuiChartsAxis-line':      { stroke: 'var(--pc-palette-divider)' },
  '& .MuiChartsAxis-tick':      { stroke: 'var(--pc-palette-divider)' },
  '& .MuiChartsAxis-tickLabel': { fill: 'var(--pc-palette-text-disabled)' },
  '& .MuiChartsGrid-line':      { stroke: 'var(--pc-palette-divider)' },
}

// Slices del pie en distintas transparencias del mismo tono: sin eso todas
// las porciones saldrían del mismo color y el gráfico sería ilegible.
const sliceColor = (base, i, n) =>
  n > 1 ? `color-mix(in srgb, ${base} ${100 - i * (55 / (n - 1))}%, transparent)` : base

const RankingChartCard = ({ titulo, items, tone = 'accent', loading, labelKey, valueKey }) => {
  const [tipo, setTipo] = useState('barras')
  const top5 = (items ?? []).slice(0, 5)
  const hayDatos = !loading && top5.length > 0
  const color = TONE_VAR[tone] || TONE_VAR.accent

  return (
    <Paper sx={{ position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
          <Typography sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{titulo}</Typography>
          {hayDatos && (
            <ToggleButtonGroup value={tipo} exclusive onChange={(e, v) => v && setTipo(v)} size="small">
              <Tooltip title="Barras horizontales">
                <ToggleButton value="barras">
                  <AlignHorizontalLeftIcon sx={{ fontSize: 16 }} />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Columnas verticales">
                <ToggleButton value="columnas">
                  <BarChartIcon sx={{ fontSize: 16 }} />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Gráfico de torta">
                <ToggleButton value="torta">
                  <PieChartIcon sx={{ fontSize: 16 }} />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          )}
        </Box>

        {loading ? (
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1.25 }} />
        ) : top5.length === 0 ? (
          <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'text.disabled', fontSize: '.84rem' }}>Sin datos</Typography>
          </Box>
        ) : tipo === 'barras' ? (
          <BarChart
            layout="horizontal"
            height={260}
            margin={{ left: 110, right: 16, top: 8, bottom: 24 }}
            yAxis={[{ scaleType: 'band', data: top5.map(i => i[labelKey]) }]}
            series={[{ data: top5.map(i => i[valueKey]), color }]}
            grid={{ vertical: true }}
            sx={AXIS_SX}
          />
        ) : tipo === 'columnas' ? (
          <BarChart
            height={260}
            margin={{ left: 48, right: 16, top: 8, bottom: 60 }}
            xAxis={[{ scaleType: 'band', data: top5.map(i => i[labelKey]) }]}
            series={[{ data: top5.map(i => i[valueKey]), color }]}
            grid={{ horizontal: true }}
            sx={AXIS_SX}
          />
        ) : (
          <PieChart
            height={260}
            series={[{
              data: top5.map((i, idx) => ({
                id: idx,
                value: i[valueKey],
                label: i[labelKey],
                color: sliceColor(color, idx, top5.length),
              })),
              innerRadius: 30,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { faded: 'global', highlighted: 'item' },
            }]}
            sx={{
              '& .MuiChartsLegend-mark':  { rx: 3 },
              '& .MuiChartsLegend-label': { fill: 'var(--pc-palette-text-disabled)' },
            }}
          />
        )}
      </Box>
    </Paper>
  )
}

export default RankingChartCard

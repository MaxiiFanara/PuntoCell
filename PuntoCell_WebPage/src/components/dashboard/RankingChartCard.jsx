import { useState } from 'react'
import { Box, Typography, Skeleton, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material'
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft'
import BarChartIcon from '@mui/icons-material/BarChart'
import PieChartIcon from '@mui/icons-material/PieChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'

const SectionLabel = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Typography
      sx={{
        fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
  </Box>
)

const RankingChartCard = ({ titulo, items, color, loading, labelKey, valueKey }) => {
  const [tipo, setTipo] = useState('barras')
  const top5 = (items ?? []).slice(0, 5)
  const hayDatos = !loading && top5.length > 0

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#fff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
        },
      }}
    >
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color[0]}, ${color[1]})` }} />
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <SectionLabel>{titulo}</SectionLabel>
          {hayDatos && (
            <ToggleButtonGroup
              value={tipo}
              exclusive
              onChange={(e, v) => v && setTipo(v)}
              size="small"
              sx={{
                ml: 1.5,
                flexShrink: 0,
                '& .MuiToggleButton-root': {
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px !important',
                  mx: 0.25,
                  p: '4px 6px',
                  color: '#94a3b8',
                  transition: 'all 0.15s',
                  '&.Mui-selected': {
                    backgroundColor: `${color[1]}18`,
                    color: color[1],
                    borderColor: `${color[1]}55`,
                    '&:hover': {
                      backgroundColor: `${color[1]}28`,
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  },
                },
                '& .MuiToggleButtonGroup-grouped': {
                  borderRadius: '8px !important',
                  border: '1.5px solid #e2e8f0 !important',
                },
              }}
            >
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
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
        ) : top5.length === 0 ? (
          <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin datos</Typography>
          </Box>
        ) : tipo === 'barras' ? (
          <BarChart
            layout="horizontal"
            height={260}
            margin={{ left: 110, right: 16, top: 8, bottom: 24 }}
            yAxis={[{ scaleType: 'band', data: top5.map(i => i[labelKey]) }]}
            series={[{ data: top5.map(i => i[valueKey]), color: color[1] }]}
            grid={{ vertical: true }}
          />
        ) : tipo === 'columnas' ? (
          <BarChart
            height={260}
            margin={{ left: 48, right: 16, top: 8, bottom: 60 }}
            xAxis={[{ scaleType: 'band', data: top5.map(i => i[labelKey]) }]}
            series={[{ data: top5.map(i => i[valueKey]), color: color[1] }]}
            grid={{ horizontal: true }}
          />
        ) : (
          <PieChart
            height={260}
            series={[{
              data: top5.map((i, idx) => ({ id: idx, value: i[valueKey], label: i[labelKey] })),
              innerRadius: 30,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { faded: 'global', highlighted: 'item' },
            }]}
          />
        )}
      </Box>
    </Box>
  )
}

export default RankingChartCard

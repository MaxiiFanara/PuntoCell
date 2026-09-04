import { Box, Paper, Typography, Skeleton } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import KpiCard from '../ui/KpiCard'

const fmt = (n) => `$ ${Math.round(n ?? 0).toLocaleString('es-AR')}`

// PieChart no lee palette.pc: mismas CSS variables reactivas a claro/oscuro
// que usa RankingChartCard.jsx.
const COSTO_VAR = 'var(--pc-palette-error-main)'
const GANANCIA_VAR = 'var(--pc-palette-primary-main)'

const FinanzasPanel = ({ finanzas, loading }) => {
  const margen = finanzas && finanzas.TotalIngresos > 0
    ? Math.round((finanzas.Ganancia / finanzas.TotalIngresos) * 100)
    : 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Finanzas</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Ingresos" tone="ok" loading={loading} value={fmt(finanzas?.TotalIngresos)} />
        <KpiCard eyebrow="Costos" tone="error" loading={loading} value={fmt(finanzas?.TotalCostos)} />
        <KpiCard
          eyebrow="Ganancia"
          tone="accent"
          loading={loading}
          value={fmt(finanzas?.Ganancia)}
          sub={finanzas ? `${margen}% de margen` : undefined}
        />

        <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>
            Composición del ingreso
          </Box>

          {loading ? (
            <Skeleton variant="rectangular" height={170} sx={{ borderRadius: 1.25 }} />
          ) : !finanzas ? (
            <Box sx={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'text.disabled', fontSize: '.84rem' }}>Sin datos</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart
                  height={170}
                  hideLegend
                  margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  series={[{
                    innerRadius: 50,
                    outerRadius: 78,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    data: [
                      { id: 0, value: finanzas.TotalCostos, label: 'Costos', color: COSTO_VAR },
                      { id: 1, value: Math.max(finanzas.Ganancia, 0), label: 'Ganancia', color: GANANCIA_VAR },
                    ],
                  }]}
                />
                <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                  <Box className="num" sx={{ fontWeight: 600, fontSize: '1.4rem', color: 'primary.main', lineHeight: 1 }}>
                    {margen}%
                  </Box>
                  <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Margen</Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: .5, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '.72rem', color: 'text.secondary', fontWeight: 600 }}>Costos</Typography>
                  </Box>
                  <Typography className="num" sx={{ fontSize: '.72rem', color: 'text.primary', fontWeight: 700 }}>
                    {fmt(finanzas.TotalCostos)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '.72rem', color: 'text.secondary', fontWeight: 600 }}>Ganancia</Typography>
                  </Box>
                  <Typography className="num" sx={{ fontSize: '.72rem', color: 'text.primary', fontWeight: 700 }}>
                    {fmt(finanzas.Ganancia)}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

export default FinanzasPanel

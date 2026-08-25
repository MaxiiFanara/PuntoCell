import { Box, Typography, Skeleton } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { PieChart } from '@mui/x-charts/PieChart'

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const CARDS_FIN = [
  {
    key: 'TotalIngresos',
    label: 'Ingresos',
    icon: TrendingUpIcon,
    g: ['#047857', '#10b981'],
    text: '#064e3b',
    border: '#6ee7b7',
  },
  {
    key: 'TotalCostos',
    label: 'Costos',
    icon: TrendingDownIcon,
    g: ['#b91c1c', '#ef4444'],
    text: '#7f1d1d',
    border: '#fca5a5',
  },
  {
    key: 'Ganancia',
    label: 'Ganancia',
    icon: AccountBalanceWalletIcon,
    g: ['#1d4ed8', '#3b82f6'],
    text: '#1e3a8a',
    border: '#93c5fd',
  },
]

const FinKpiCard = ({ label, valor, icon, g, text, border, loading }) => {
  const Icono = icon
  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#fff',
        border: `1.5px solid ${border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'transform 0.18s, box-shadow 0.18s',
        cursor: 'default',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 28px rgba(0,0,0,0.10)' },
      }}
    >
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${g[0]}, ${g[1]})` }} />
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${g[0]}44`,
            }}
          >
            <Icono sx={{ color: '#fff', fontSize: 21 }} />
          </Box>
        </Box>

        {loading ? (
          <Skeleton variant="text" width={120} height={44} sx={{ borderRadius: 1 }} />
        ) : (
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.55rem',
              lineHeight: 1,
              color: text,
              letterSpacing: '-0.03em',
              mb: 0.5,
            }}
          >
            {ARS.format(valor ?? 0)}
          </Typography>
        )}

        <Typography
          sx={{
            fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  )
}

const FinanzasPanel = ({ finanzas, loading }) => {
  const margen = finanzas && finanzas.TotalIngresos > 0
    ? Math.round((finanzas.Ganancia / finanzas.TotalIngresos) * 100)
    : 0

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
          }}
        >
          Finanzas
        </Typography>
        <Box sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        {CARDS_FIN.map(({ key, label, icon, g, text, border }) => (
          <FinKpiCard
            key={key}
            label={label}
            valor={finanzas?.[key]}
            icon={icon}
            g={g}
            text={text}
            border={border}
            loading={loading}
          />
        ))}

        <Box
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: '#fff',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1,
            }}
          >
            Composición del ingreso
          </Typography>

          {loading ? (
            <Skeleton variant="rectangular" height={170} sx={{ borderRadius: 2 }} />
          ) : !finanzas ? (
            <Box sx={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin datos</Typography>
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
                      { id: 0, value: finanzas.TotalCostos, label: 'Costos', color: '#ef4444' },
                      { id: 1, value: Math.max(finanzas.Ganancia, 0), label: 'Ganancia', color: '#3b82f6' },
                    ],
                  }]}
                />
                <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#1e3a8a', lineHeight: 1 }}>
                    {margen}%
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Margen
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Costos</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 700 }}>{ARS.format(finanzas.TotalCostos)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Ganancia</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 700 }}>{ARS.format(finanzas.Ganancia)}</Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default FinanzasPanel

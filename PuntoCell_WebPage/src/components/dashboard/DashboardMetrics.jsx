import { Typography, Box, Skeleton } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import BuildIcon from '@mui/icons-material/Build'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CancelIcon from '@mui/icons-material/Cancel'

const CARDS = [
  { key: 'ordenesActivas',  label: 'Órdenes Activas',  icon: AssignmentIcon,
    g: ['#047857','#10b981'], text: '#064e3b', soft: '#d1fae5', border: '#6ee7b7' },
  { key: 'enEspera',        label: 'En Espera',        icon: HourglassEmptyIcon,
    g: ['#b45309','#f59e0b'], text: '#78350f', soft: '#fef3c7', border: '#fde68a' },
  { key: 'enReparacion',    label: 'En Reparación',    icon: BuildIcon,
    g: ['#0369a1','#0ea5e9'], text: '#0c4a6e', soft: '#e0f2fe', border: '#7dd3fc' },
  { key: 'terminado',       label: 'Terminado',        icon: CheckCircleIcon,
    g: ['#0f766e','#14b8a6'], text: '#134e4a', soft: '#ccfbf1', border: '#5eead4' },
  { key: 'entregado',       label: 'Entregado',        icon: LocalShippingIcon,
    g: ['#6d28d9','#8b5cf6'], text: '#4c1d95', soft: '#ede9fe', border: '#c4b5fd' },
  { key: 'anulado',         label: 'Anulado',          icon: CancelIcon,
    g: ['#374151','#64748b'], text: '#1f2937', soft: '#f1f5f9', border: '#cbd5e1' },
]

const MetricCard = ({ label, value, icon: Icon, g, text, soft, border, loading }) => (
  <Box
    sx={{
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: '#fff',
      border: `1.5px solid ${border}`,
      boxShadow: `0 2px 8px rgba(0,0,0,0.04)`,
      transition: 'transform 0.18s, box-shadow 0.18s',
      cursor: 'default',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 10px 28px rgba(0,0,0,0.10)`,
      },
    }}
  >
    {/* Top gradient strip */}
    <Box sx={{ height: 4, background: `linear-gradient(90deg, ${g[0]}, ${g[1]})` }} />

    <Box sx={{ p: 2.5 }}>
      {/* Icon + label row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
          background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${g[0]}44`,
        }}>
          <Icon sx={{ color: '#fff', fontSize: 21 }} />
        </Box>
      </Box>

      {/* Value */}
      {loading ? (
        <Skeleton variant="text" width={52} height={44} sx={{ borderRadius: 1 }} />
      ) : (
        <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1, color: text, letterSpacing: '-0.03em', mb: 0.5 }}>
          {value ?? '–'}
        </Typography>
      )}

      {/* Label */}
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  </Box>
)

const DashboardMetrics = ({ metricas, loading }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        Resumen general
      </Typography>
      <Box sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
    </Box>

    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(7,1fr)' },
      gap: 2,
    }}>
      {CARDS.map(({ key, label, icon, g, text, soft, border }) => (
        <MetricCard
          key={key}
          label={label}
          value={metricas?.[key]}
          icon={icon}
          g={g}
          text={text}
          soft={soft}
          border={border}
          loading={loading}
        />
      ))}
    </Box>
  </Box>
)

export default DashboardMetrics

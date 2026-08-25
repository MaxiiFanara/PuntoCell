import { Box, Container, Typography, Alert, IconButton, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import DevicesIcon from '@mui/icons-material/Devices'
import BuildIcon from '@mui/icons-material/Build'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Navbar from '../components/layout/Navbar'
import KpiCard from '../components/dashboard/KpiCard'
import RankingChartCard from '../components/dashboard/RankingChartCard'
import FinanzasPanel from '../components/dashboard/FinanzasPanel'
import { useEstadisticas } from '../hooks/useEstadisticas'

const COLORES = {
  marca:      ['#0369a1', '#0ea5e9'],
  dispositivo: ['#6d28d9', '#8b5cf6'],
  repuesto:   ['#0f766e', '#14b8a6'],
  falla:      ['#b45309', '#f59e0b'],
}

const KPI_CONFIG = [
  {
    id: 'marca',
    label: 'Marca más reparada',
    icon: SmartphoneIcon,
    g: COLORES.marca,
    text: '#0c4a6e',
    border: '#7dd3fc',
    getNombre: (d) => d?.marcas?.[0]?.Marca,
    getDato: (d) => d?.marcas?.[0]?.CantidadReparaciones,
    datoSuffix: 'reparaciones',
  },
  {
    id: 'dispositivo',
    label: 'Dispositivo más reparado',
    icon: DevicesIcon,
    g: COLORES.dispositivo,
    text: '#4c1d95',
    border: '#c4b5fd',
    getNombre: (d) => d?.dispositivos?.[0]?.Dispositivo,
    getDato: (d) => d?.dispositivos?.[0]?.CantidadReparaciones,
    datoSuffix: 'reparaciones',
  },
  {
    id: 'repuesto',
    label: 'Repuesto más usado',
    icon: BuildIcon,
    g: COLORES.repuesto,
    text: '#134e4a',
    border: '#5eead4',
    getNombre: (d) => d?.repuestos?.[0]?.Repuesto,
    getDato: (d) => d?.repuestos?.[0]?.CantidadUsada,
    datoSuffix: 'unidades',
  },
  {
    id: 'falla',
    label: 'Falla más frecuente',
    icon: WarningAmberIcon,
    g: COLORES.falla,
    text: '#78350f',
    border: '#fde68a',
    getNombre: (d) => d?.fallas?.[0]?.Falla,
    getDato: (d) => d?.fallas?.[0]?.CantidadReportada,
    datoSuffix: 'veces',
  },
]

const SectionHeader = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
    <Typography
      sx={{
        fontSize: '0.7rem',
        fontWeight: 800,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Typography>
    <Box
      sx={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #e2e8f0, transparent)' }}
    />
  </Box>
)

const DashboardPage = () => {
  const { data, loading, error, recargar } = useEstadisticas()

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#eef2f7' }}>
      

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>

        {/* Encabezado */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.35rem', sm: '1.6rem' },
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Dashboard de Estadísticas
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 0.5 }}>
              Métricas del taller — solo órdenes entregadas
            </Typography>
          </Box>

          <Tooltip title="Actualizar datos">
            <span>
              <IconButton
                onClick={recargar}
                disabled={loading}
                sx={{
                  backgroundColor: '#fff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 2,
                  color: '#475569',
                  '&:hover': { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },
                }}
              >
                <RefreshIcon
                  sx={{
                    transition: 'transform 0.4s',
                    ...(loading && { animation: 'spin 1s linear infinite' }),
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Sección: Métricas principales */}
        <Box sx={{ mb: 4 }}>
          <SectionHeader>Métricas principales</SectionHeader>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' },
              gap: 2,
            }}
          >
            {KPI_CONFIG.map(({ id, label, icon, g, text, border, getNombre, getDato, datoSuffix }) => (
              <KpiCard
                key={id}
                label={label}
                nombre={getNombre(data)}
                dato={getDato(data)}
                datoSuffix={datoSuffix}
                icon={icon}
                g={g}
                text={text}
                border={border}
                loading={loading}
              />
            ))}
          </Box>
        </Box>

        {/* Sección: Finanzas */}
        {(loading || data?.finanzas) && (
          <FinanzasPanel finanzas={data?.finanzas ?? null} loading={loading} />
        )}

        {/* Sección: Rankings */}
        <Box sx={{ mb: 4 }}>
          <SectionHeader>Rankings — Top 5</SectionHeader>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' },
              gap: 2,
            }}
          >
            <RankingChartCard
              titulo="Marcas más reparadas"
              items={data?.marcas ?? []}
              color={COLORES.marca}
              loading={loading}
              labelKey="Marca"
              valueKey="CantidadReparaciones"
            />
            <RankingChartCard
              titulo="Dispositivos más reparados"
              items={data?.dispositivos ?? []}
              color={COLORES.dispositivo}
              loading={loading}
              labelKey="Dispositivo"
              valueKey="CantidadReparaciones"
            />
            <RankingChartCard
              titulo="Repuestos más usados"
              items={data?.repuestos ?? []}
              color={COLORES.repuesto}
              loading={loading}
              labelKey="Repuesto"
              valueKey="CantidadUsada"
            />
            <RankingChartCard
              titulo="Fallas más frecuentes"
              items={data?.fallas ?? []}
              color={COLORES.falla}
              loading={loading}
              labelKey="Falla"
              valueKey="CantidadReportada"
            />
          </Box>
        </Box>

      </Container>
    </Box>
  )
}

export default DashboardPage

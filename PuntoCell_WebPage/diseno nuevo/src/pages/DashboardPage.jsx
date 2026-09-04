import { Box, Typography, Alert, IconButton, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/ui/KpiCard'
import RankingChartCard from '../components/dashboard/RankingChartCard'
import FinanzasPanel from '../components/dashboard/FinanzasPanel'
import { useEstadisticas } from '../hooks/useEstadisticas'

const KPI_CONFIG = [
  {
    id: 'marca',
    eyebrow: 'Marca más reparada',
    tone: 'accent',
    getNombre: (d) => d?.marcas?.[0]?.Marca,
    getDato: (d) => d?.marcas?.[0]?.CantidadReparaciones,
    datoSuffix: 'reparaciones',
  },
  {
    id: 'dispositivo',
    eyebrow: 'Dispositivo más reparado',
    tone: 'ok',
    getNombre: (d) => d?.dispositivos?.[0]?.Dispositivo,
    getDato: (d) => d?.dispositivos?.[0]?.CantidadReparaciones,
    datoSuffix: 'reparaciones',
  },
  {
    id: 'repuesto',
    eyebrow: 'Repuesto más usado',
    tone: 'warn',
    getNombre: (d) => d?.repuestos?.[0]?.Repuesto,
    getDato: (d) => d?.repuestos?.[0]?.CantidadUsada,
    datoSuffix: 'unidades',
  },
  {
    id: 'falla',
    eyebrow: 'Falla más frecuente',
    tone: 'mute',
    getNombre: (d) => d?.fallas?.[0]?.Falla,
    getDato: (d) => d?.fallas?.[0]?.CantidadReportada,
    datoSuffix: 'veces',
  },
]

const RANKINGS = [
  { id: 'marca', titulo: 'Marcas más reparadas', dataKey: 'marcas', tone: 'accent', labelKey: 'Marca', valueKey: 'CantidadReparaciones' },
  { id: 'dispositivo', titulo: 'Dispositivos más reparados', dataKey: 'dispositivos', tone: 'error', labelKey: 'Dispositivo', valueKey: 'CantidadReparaciones' },
  { id: 'repuesto', titulo: 'Repuestos más usados', dataKey: 'repuestos', tone: 'warn', labelKey: 'Repuesto', valueKey: 'CantidadUsada' },
  { id: 'falla', titulo: 'Fallas más frecuentes', dataKey: 'fallas', tone: 'mute', labelKey: 'Falla', valueKey: 'CantidadReportada' },
]

const SectionLabel = ({ children }) => (
  <Typography sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1.25 }}>{children}</Typography>
)

const DashboardPage = () => {
  const { data, loading, error, recargar } = useEstadisticas()

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>

      <PageHeader
        eyebrow="Estadísticas"
        title="Dashboard"
        meta="Métricas del taller — solo órdenes entregadas"
        action={
          <Tooltip title="Actualizar datos">
            <span>
              <IconButton onClick={recargar} disabled={loading}>
                <RefreshIcon
                  sx={{
                    transition: 'transform .4s',
                    ...(loading && { animation: 'spin 1s linear infinite' }),
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        }
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Box>
        <SectionLabel>Métricas principales</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
          {KPI_CONFIG.map(({ id, eyebrow, tone, getNombre, getDato, datoSuffix }) => {
            const dato = getDato(data)
            return (
              <KpiCard
                key={id}
                eyebrow={eyebrow}
                tone={tone}
                loading={loading}
                value={getNombre(data) ?? '–'}
                sub={dato != null ? `${dato} ${datoSuffix}` : undefined}
              />
            )
          })}
        </Box>
      </Box>

      {(loading || data?.finanzas) && (
        <FinanzasPanel finanzas={data?.finanzas ?? null} loading={loading} />
      )}

      <Box>
        <SectionLabel>Rankings — Top 5</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 1.5 }}>
          {RANKINGS.map(({ id, titulo, dataKey, tone, labelKey, valueKey }) => (
            <RankingChartCard
              key={id}
              titulo={titulo}
              items={data?.[dataKey] ?? []}
              tone={tone}
              loading={loading}
              labelKey={labelKey}
              valueKey={valueKey}
            />
          ))}
        </Box>
      </Box>

    </Box>
  )
}

export default DashboardPage

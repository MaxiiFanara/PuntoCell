import { Box, Typography, Skeleton } from '@mui/material'

const KpiCard = ({ label, nombre, dato, datoSuffix, icon, g, text, border, loading }) => {
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
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
        },
      }}
    >
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${g[0]}, ${g[1]})` }} />

      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
              background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${g[0]}44`,
            }}
          >
            <Icono sx={{ color: '#fff', fontSize: 21 }} />
          </Box>
        </Box>

        {loading ? (
          <>
            <Skeleton variant="text" width={140} height={28} sx={{ borderRadius: 1, mb: 0.5 }} />
            <Skeleton variant="text" width={64} height={20} sx={{ borderRadius: 1 }} />
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.05rem',
                lineHeight: 1.25,
                color: text,
                letterSpacing: '-0.01em',
                mb: 0.5,
                wordBreak: 'break-word',
              }}
            >
              {nombre ?? '–'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
                mb: 1,
              }}
            >
              {label}
            </Typography>
            {dato != null && (
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                {dato}
                {datoSuffix ? ` ${datoSuffix}` : ''}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default KpiCard

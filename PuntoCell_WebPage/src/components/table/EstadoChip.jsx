import { Chip } from '@mui/material'

const CONFIG = {
  'en espera':     { label: 'Espera',     bg: '#fef3c7', color: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  'en reparación': { label: 'Reparación', bg: '#e0f2fe', color: '#075985', border: '#bae6fd', dot: '#0ea5e9' },
  terminado:       { label: 'Terminado',  bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', dot: '#10b981' },
  entregado:       { label: 'Entregado',  bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd', dot: '#8b5cf6' },
  anulado:         { label: 'Anulada',    bg: '#fee2e2', color: '#7f1d1d', border: '#fecaca', dot: '#ef4444' },
}

const EstadoChip = ({ estado }) => {
  const key = estado?.toLowerCase()
  const cfg = CONFIG[key] || { label: estado, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      icon={
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: cfg.dot, flexShrink: 0,
          marginLeft: 8, marginRight: -4,
        }} />
      }
      sx={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1.5px solid ${cfg.border}`,
        fontWeight: 700,
        fontSize: '0.72rem',
        height: 24,
        '& .MuiChip-label': { pr: 1.25, pl: 0.75 },
        '& .MuiChip-icon': { ml: 0.75, mr: 0 },
      }}
    />
  )
}

export default EstadoChip

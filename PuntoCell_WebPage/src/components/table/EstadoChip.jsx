import StatusPill from '../ui/StatusPill'

// Gradiente de atención: encolado → en curso → requiere acción → cerrado → anulado.
const CONFIG = {
  'en espera':     { label: 'Espera',     tone: 'neutral' },
  'en reparación': { label: 'Reparación', tone: 'flat' },
  terminado:       { label: 'Terminado',  tone: 'due' },
  entregado:       { label: 'Entregado',  tone: 'ok' },
  anulado:         { label: 'Anulada',    tone: 'late' },
  abandonado:      { label: 'Abandonado', tone: 'late' },
}

const EstadoChip = ({ estado }) => {
  const cfg = CONFIG[estado?.toLowerCase()] || { label: estado, tone: 'neutral' }
  return <StatusPill tone={cfg.tone} label={cfg.label} />
}

export default EstadoChip

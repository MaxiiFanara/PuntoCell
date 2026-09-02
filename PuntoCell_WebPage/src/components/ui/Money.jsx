import { Box } from '@mui/material'

const fmtArs = (n) =>
  typeof n === 'number' ? n.toLocaleString('es-AR', { maximumFractionDigits: 0 }) : n

const fmtUsd = (n) =>
  typeof n === 'number' ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n

/**
 * Muestra un importe en las dos monedas, dólar como moneda principal (grande, arriba) y
 * peso como su representación visual (chica, debajo) según la cotización vigente. `usd`
 * (recibido ya calculado por quien llama) es la fuente de verdad del sistema; `ars` es
 * siempre `usd * cotización vigente`, nunca un valor independiente.
 */
export default function Money({ ars, usd, align = 'right', size = 'md', sx }) {
  const usdSize = { sm: '.78rem', md: '.84rem', lg: '1.5rem' }[size]
  const arsSize = { sm: '.66rem', md: '.69rem', lg: '.72rem' }[size]

  return (
    <Box sx={{ textAlign: align, lineHeight: 1.15, ...sx }}>
      <Box
        className="num"
        sx={{
          fontSize: usdSize,
          fontWeight: 600,
          letterSpacing: size === 'lg' ? '-.035em' : '-.015em',
          whiteSpace: 'nowrap',
          color: 'text.primary',
        }}
      >
        U$S {fmtUsd(usd)}
      </Box>
      {ars != null && (
        <Box
          className="num"
          sx={{ fontSize: arsSize, color: 'text.disabled', whiteSpace: 'nowrap' }}
        >
          $ {fmtArs(ars)}
        </Box>
      )}
    </Box>
  )
}

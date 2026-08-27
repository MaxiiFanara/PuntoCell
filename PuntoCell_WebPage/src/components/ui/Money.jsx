import { Box } from '@mui/material'

const fmtArs = (n) =>
  typeof n === 'number' ? n.toLocaleString('es-AR', { maximumFractionDigits: 0 }) : n

const fmtUsd = (n) =>
  typeof n === 'number' ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n

/**
 * Importe del sistema: pesos como moneda principal, dólar como referencia debajo.
 * Es la regla invertida respecto de como estaba el código viejo.
 */
export default function Money({ ars, usd, align = 'right', size = 'md', sx }) {
  const arsSize = { sm: '.78rem', md: '.84rem', lg: '1.5rem' }[size]
  const usdSize = { sm: '.66rem', md: '.69rem', lg: '.72rem' }[size]

  return (
    <Box sx={{ textAlign: align, lineHeight: 1.15, ...sx }}>
      <Box
        className="num"
        sx={{
          fontSize: arsSize,
          fontWeight: 600,
          letterSpacing: size === 'lg' ? '-.035em' : '-.015em',
          whiteSpace: 'nowrap',
          color: 'text.primary',
        }}
      >
        $ {fmtArs(ars)}
      </Box>
      {usd != null && (
        <Box
          className="num"
          sx={{ fontSize: usdSize, color: 'text.disabled', whiteSpace: 'nowrap' }}
        >
          U$S {fmtUsd(usd)}
        </Box>
      )}
    </Box>
  )
}

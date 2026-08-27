import { Box, Paper } from '@mui/material'

/**
 * Un campo de la barra: eyebrow arriba, control abajo.
 * `span` estira el campo en el grid (el rango de fechas ocupa 2).
 */
export function FilterField({ label, children, span = 1, sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minWidth: 0,
        gridColumn: span > 1 ? `span ${span}` : undefined,
        ...sx,
      }}
    >
      {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled', pl: '1px' }}>{label}</Box>}
      {children}
    </Box>
  )
}

/**
 * Shell de la barra de filtros del mockup. Deliberadamente NO recibe una config
 * de campos: los campos van como children y cada pantalla arma los suyos.
 * `chips` son los filtros activos, `actions` el bloque Limpiar / Buscar.
 */
export default function FilterBar({ children, chips, actions, columns, sx }) {
  return (
    <Paper component="form" onSubmit={(e) => e.preventDefault()} sx={{ ...sx }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: columns || 'repeat(auto-fit, minmax(150px, 1fr))',
          },
          gap: 1.25,
          p: '13px 15px',
        }}
      >
        {children}
      </Box>

      {(chips || actions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            p: '0 15px 13px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            {chips}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {actions}
          </Box>
        </Box>
      )}
    </Paper>
  )
}

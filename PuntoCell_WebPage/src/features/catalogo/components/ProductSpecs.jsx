import { Box, Typography } from '@mui/material'
import { muted } from '../../../components/ui/publicStyles'

/**
 * Los tres registros fijos de un producto: memoria, color y sucursal.
 *
 * Siempre los tres y siempre en este orden, incluso cuando alguno no aplica. Un
 * repuesto no tiene memoria, pero si la fila desaparece la grilla deja de ser
 * comparable y escanear veinte productos pasa a ser veinte lecturas en vez de
 * una. "No aplica" ocupa el lugar y responde la pregunta.
 *
 * Un solo filete arriba del grupo y aire entre las filas: un filete por fila
 * convierte tres datos en una planilla.
 */
export default function ProductSpecs({ product, denso = false }) {
  const memoria = product.dimensions ? product.dimensions.replace(/^Memoria:\s*/, '') : null

  // Un accesorio o un repuesto no tienen memoria: ahí "No aplica" es la verdad.
  // Un celular sí la tiene, y que la base no la registre no es lo mismo: decirle
  // "No aplica" a un iPhone es mentirle al comprador.
  const tieneMemoria = ['smartphone', 'tablet', 'notebook'].includes(
    (product.category || '').toLowerCase().trim(),
  )
  const sinMemoria = tieneMemoria ? 'Sin especificar' : 'No aplica'

  const filas = [
    { label: 'Memoria', value: memoria, vacio: !memoria, vacioTexto: sinMemoria },
    { label: 'Color', value: product.material || 'Estándar', vacio: !product.material, vacioTexto: 'Sin especificar' },
    { label: 'Sucursal', value: product.sucursal, vacio: !product.sucursal, vacioTexto: 'Sin especificar' },
  ]

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        mt: denso ? 2 : 2.5,
        pt: denso ? 1.75 : 2,
        borderTop: 1,
        borderColor: 'divider',
        display: 'grid',
        gap: denso ? 0.75 : 1,
      }}
    >
      {filas.map((f) => (
        <Box
          key={f.label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 2,
            fontSize: denso ? '.8125rem' : '.9375rem',
          }}
        >
          <Typography component="dt" sx={{ ...muted, fontSize: 'inherit' }}>
            {f.label}
          </Typography>
          <Typography
            component="dd"
            sx={{
              m: 0,
              fontSize: 'inherit',
              textAlign: 'right',
              fontWeight: f.vacio ? 400 : 500,
              ...(f.vacio && muted),
            }}
          >
            {f.vacio ? f.vacioTexto : f.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

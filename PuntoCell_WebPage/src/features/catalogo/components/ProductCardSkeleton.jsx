import { Box, Paper, Skeleton } from '@mui/material'

// Espeja la geometría real de ProductCard: mismo padding, misma pila y el mismo
// filete arriba de los registros. Si cambia la card, cambia acá, si no el layout
// salta cuando terminan de cargar los productos.
export default function ProductCardSkeleton() {
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, borderRadius: 2 }}>
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.78rem', width: '38%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.0625rem', mt: 0.5 }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.0625rem', width: '65%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.375rem', width: '52%', mt: 1.5 }} />

      <Box sx={{ mt: 2, pt: 1.75, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 0.75 }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem' }} />
      </Box>

      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '58%', mt: 'auto', pt: 2.5 }} />
    </Paper>
  )
}

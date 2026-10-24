import { Box, Paper, Skeleton } from '@mui/material'

// Espeja la geometría real de ProductCard: mismo padding (2.5), escenario de la foto con
// 14px de radio, categoría, nombre, precio, una línea de datos y el pie. Si cambia la
// card, cambia acá, si no el layout salta cuando terminan de cargar los productos.
export default function ProductCardSkeleton() {
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2.5, borderRadius: '22px' }}>
      <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', aspectRatio: '4 / 3', mb: 2.25, borderRadius: '14px' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.6875rem', width: '30%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.1875rem', mt: 0.75 }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.1875rem', width: '62%' }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.75rem', width: '44%', mt: 1 }} />
      <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '70%', mt: 0.75 }} />

      <Box sx={{ mt: 'auto', pt: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '48%' }} />
        <Skeleton variant="circular" animation="wave" width={38} height={38} />
      </Box>
    </Paper>
  )
}

import { Box, Paper, Skeleton } from '@mui/material'

// Espeja la geometría real de ProductCard: marco de 8px, foto de 20px de radio en 5/4,
// categoría, nombre, fila de precio con acciones, datos y stock. Si cambia la card,
// cambia acá, si no el layout salta cuando terminan de cargar los productos.
export default function ProductCardSkeleton() {
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, borderRadius: '28px' }}>
      <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', aspectRatio: '5 / 4', borderRadius: '20px' }} />
      <Box sx={{ px: 1.5, pt: 1.75, pb: 1.25 }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.6875rem', width: '30%' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.0625rem', mt: 0.5 }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.0625rem', width: '62%' }} />
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.625rem', width: '42%' }} />
          <Skeleton variant="circular" animation="wave" width={36} height={36} />
        </Box>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '70%' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.8125rem', width: '52%', mt: 1 }} />
      </Box>
    </Paper>
  )
}

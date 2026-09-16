import { Box, Paper, Skeleton } from '@mui/material';

// Espeja la geometría real de ProductCard: imagen 4/3, cuerpo con p:2 y la
// misma pila. Si cambia la card, cambia acá.
export default function ProductCardSkeleton() {
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', aspectRatio: '4 / 3' }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.59rem', width: '35%' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '.95rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.15rem', width: '50%', mt: 0.5 }} />
        <Skeleton variant="rounded" animation="wave" height={32} sx={{ mt: 'auto', borderRadius: '8px' }} />
      </Box>
    </Paper>
  );
}

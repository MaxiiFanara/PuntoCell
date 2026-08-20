import { Card, CardContent, CardActions, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function ProductCardSkeleton() {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: theme.palette.background.paper, boxShadow: theme.shadows[1] }}>
      <Skeleton variant="rectangular" height={320} animation="wave" />
      <CardContent sx={{ flexGrow: 1, pb: 2, p: 3 }}>
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '1rem', mb: 0.5 }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '0.875rem' }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '0.875rem', width: '60%', mb: 1 }} />
        <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.2rem', width: '40%' }} />
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0, gap: 1, pb: 3 }}>
        <Skeleton variant="rounded" animation="wave" height={42} sx={{ flexGrow: 1, borderRadius: 3 }} />
        <Skeleton variant="rounded" animation="wave" width={42} height={42} sx={{ borderRadius: 3 }} />
      </CardActions>
    </Card>
  );
}

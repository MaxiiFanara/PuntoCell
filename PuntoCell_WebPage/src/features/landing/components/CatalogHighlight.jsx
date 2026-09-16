import { Box, Button, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';

import ProductCard from '../../catalogo/components/ProductCard';
import ProductCardSkeleton from '../../catalogo/components/ProductCardSkeleton';
import { useProducts } from '../../catalogo/context/ProductContext';

export default function CatalogHighlight() {
  const { products, loading } = useProducts();
  // Lo que se muestra acá es "lo que hay en el local ahora", no una selección
  // editorial: el flag `featured` del contexto era literalmente stock > 0.
  const disponibles = products.filter((p) => p.stock > 0).slice(0, 4);

  if (!loading && disponibles.length === 0) return null;

  return (
    <Box
      component="section"
      sx={{ px: 2.5, py: { xs: 6, md: 9 }, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}
    >
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            mb: 3,
          }}
        >
          <Typography
            component="h2"
            sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 600, letterSpacing: '-.03em' }}
          >
            Disponibles ahora
          </Typography>
          <Button
            component={Link}
            to="/catalogo"
            endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
          >
            Ver todo el catálogo
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 2,
          }}
        >
          {loading
            ? [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
            : disponibles.map((p) => <ProductCard key={p.id} product={p} />)}
        </Box>
      </Box>
    </Box>
  );
}

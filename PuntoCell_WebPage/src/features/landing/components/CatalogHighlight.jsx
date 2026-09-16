import { Box, Button, Paper, Typography, Skeleton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import StatusPill from '../../../components/ui/StatusPill';
import ProductImagePlaceholder from '../../catalogo/components/ProductImagePlaceholder';
import { useProducts } from '../../catalogo/context/ProductContext';
import { formatCategoria } from '../../catalogo/utils/categorias';
import { formatCurrency } from '../../catalogo/utils/whatsapp';

export default function CatalogHighlight() {
  const { products, loading } = useProducts();
  const destacados = products.filter((p) => p.featured).slice(0, 4);

  if (!loading && destacados.length === 0) return null;

  return (
    <Box component="section" sx={{ px: 2.5, py: { xs: 8, md: 12 }, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>

        <Box sx={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 2, mb: { xs: 3.5, md: 5 }, flexWrap: 'wrap',
        }}>
          <Box>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Vidriera</Box>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 600, letterSpacing: '-.03em' }}>
              Equipos destacados
            </Typography>
            <Typography sx={{ mt: 1, fontSize: '1rem', color: 'text.secondary' }}>
              Los modelos más buscados, con entrega inmediata.
            </Typography>
          </Box>
          <Button href="/catalogo" endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}>
            Ver todo el catálogo
          </Button>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {loading
            ? [...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={310} />
              ))
            : destacados.map((p) => (
              <Paper
                key={p.id}
                sx={{
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  transition: 'border-color .2s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box sx={{ position: 'relative', height: 190, borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
                  <ProductImagePlaceholder categoria={p.category} />
                  <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                    <StatusPill tone={p.stock > 0 ? 'ok' : 'flat'} label={p.stock > 0 ? formatCategoria(p.category) : 'Sin stock'} />
                  </Box>
                </Box>

                <Box sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                  <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{p.dimensions || p.material}</Box>
                  <Typography component="h3" sx={{ fontWeight: 600, fontSize: '.95rem', letterSpacing: '-.015em' }}>
                    {p.name}
                  </Typography>
                  <Typography className="mono" sx={{ mt: 0.5, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-.02em', color: 'primary.main' }}>
                    ${formatCurrency(p.price)}
                  </Typography>
                  <Button href={`/catalogo/product/${p.id}`} variant="outlined" fullWidth sx={{ mt: 1.75 }}>
                    Ver detalle
                  </Button>
                </Box>
              </Paper>
            ))}
        </Box>
      </Box>
    </Box>
  );
}

import {
  Container,
  Grid,
  Typography,
  Box,
  Fade,
} from '@mui/material';

import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import CategoryFilter from '../components/CategoryFilter';

import { STORE_CONFIG } from '../config/store';

const { catalog } = STORE_CONFIG;
import { useTheme } from '@mui/material/styles';

export default function CatalogSection({
  catalogRef,
  categories,
  category,
  setCategory,
  filtered,
  loading,
}) {
  const theme = useTheme();
  
  return (
    <Container
      ref={catalogRef}
      maxWidth="lg"
      sx={{
        pb: 12,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          mb: 5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              lineHeight: 1,
              mb: 1,
            }}
          >
            {catalog.title}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
          >
            {catalog.subtitle}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          {filtered.length} productos
        </Typography>
      </Box>

      {/* CATEGORÍAS */}
      <Box sx={{ mb: 5 }}>
        <CategoryFilter
          categories={categories}
          selected={category}
          onChange={setCategory}
        />
      </Box>

      {/* LOADING */}
      {loading ? (
        // Agregamos alignItems="stretch" aquí
        <Grid container spacing={theme.custom.grid.spacing} alignItems="stretch">
          {[...Array(8)].map((_, i) => (
            <Grid
              item
              xs={12} // Cambiado a 12 para que ocupe todo el ancho en celulares
              sm={6}
              md={4}
              lg={3}
              key={i}
              sx={{ display: 'flex' }} // Esto permite que el esqueleto se estire
            >
              <Box sx={{ width: '100%', display: 'flex' }}>
                <ProductCardSkeleton />
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            color: 'text.secondary',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 1,
              fontWeight: 600,
            }}
          >
            No encontramos productos
          </Typography>

          <Typography variant="body1">
            Probá otra búsqueda o categoría.
          </Typography>
        </Box>
      ) : (
        // Agregamos alignItems="stretch" aquí
        <Box
        sx={{
          display: 'grid',
          // Aquí definimos exactamente cuántas columnas queremos según la pantalla
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)', // 1 columna en celulares
            sm: 'repeat(2, 1fr)', // 2 columnas en tablets
            md: 'repeat(3, 1fr)', // 3 columnas en laptops
            lg: 'repeat(4, 1fr)', // 4 columnas en PC de escritorio
          },
          gap: 3, // El espacio entre las tarjetas (equivalente al spacing={3})
          alignItems: 'stretch' // Hace que todas las tarjetas midan lo mismo de alto
        }}
      >
        {filtered.map((product, index) => (
          <Fade in timeout={300 + index * 80} key={product.id}>
            {/* El div es necesario para que el Fade funcione sin romper el Grid */}
            <div style={{ display: 'flex', height: '100%' }}> 
              <ProductCard product={product} />
            </div>
          </Fade>
        ))}
      </Box>
      )}
    </Container>
  );
}

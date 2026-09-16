import {
  Box,
  Button,
  Container,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';

import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import CategoryFilter from '../components/CategoryFilter';
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs';

import { STORE_CONFIG } from '../config/store';

const { catalog } = STORE_CONFIG;

const ORDENES = [
  { valor: 'relevancia', label: 'Relevancia' },
  { valor: 'precio-asc', label: 'Menor precio' },
  { valor: 'precio-desc', label: 'Mayor precio' },
  { valor: 'nombre', label: 'Nombre (A-Z)' },
];

// Una sola definición de grilla para el listado y para los esqueletos: si no,
// el layout salta cuando terminan de cargar los productos.
const GRILLA = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: 2,
  alignItems: 'stretch',
};

export default function CatalogSection({
  categories,
  filtros,
  setSearch,
  setCategory,
  setSoloStock,
  setOrden,
  limpiar,
  filtered,
  totalCount,
  loading,
}) {
  const hayFiltros =
    filtros.search !== '' || filtros.category !== 'Todos' || filtros.soloStock;

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 10 }}>
      <CatalogBreadcrumbs />

      {/* Cabecera mínima: se entra directo al listado. Antes había un bloque
          de bienvenida que se comía la primera pantalla y hacía sentir el
          catálogo como una segunda landing. */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
        <Typography
          component="h1"
          sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 600, letterSpacing: '-.03em' }}
        >
          {catalog.title}
        </Typography>
        {!loading && (
          <Typography className="num" sx={{ fontSize: '.78rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {filtered.length === totalCount
              ? `${totalCount} productos`
              : `${filtered.length} de ${totalCount}`}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 2,
        }}
      >
        <TextField
          placeholder="Buscar por nombre, modelo o categoría"
          value={filtros.search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          aria-label="Buscar productos"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: '1 1 260px', maxWidth: { sm: 360 } }}
        />

        <TextField
          select
          value={filtros.orden}
          onChange={(e) => setOrden(e.target.value)}
          aria-label="Ordenar productos"
          sx={{ width: 168 }}
        >
          {ORDENES.map((o) => (
            <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filtros.soloStock}
              onChange={(e) => setSoloStock(e.target.checked)}
            />
          }
          label="Sólo con stock"
          slotProps={{ typography: { sx: { fontSize: '.78rem', color: 'text.secondary' } } }}
          sx={{ ml: 0, mr: 0 }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <CategoryFilter categories={categories} selected={filtros.category} onChange={setCategory} />
      </Box>

      {loading ? (
        <Box sx={GRILLA}>
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
          <SearchOffIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5 }}>
            {catalog.emptyState.title}
          </Typography>
          <Typography sx={{ fontSize: '.85rem', color: 'text.secondary' }}>
            {catalog.emptyState.subtitle}
          </Typography>
          {hayFiltros && (
            <Button variant="outlined" onClick={limpiar} sx={{ mt: 2.5 }}>
              Limpiar filtros
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={GRILLA}>
          {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
        </Box>
      )}
    </Container>
  );
}

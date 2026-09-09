import { useMemo, useRef, useState } from 'react';

import { Box, Fade, Grid, Typography } from '@mui/material';

import HeroSection from './HeroSection';
import CatalogSection from './CatalogSection';

import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';

import CategoryFilter from '../components/CategoryFilter';

import { useProducts } from '../context/ProductContext';

import { STORE_CONFIG } from '../config/store';

export default function DynamicSections() {
  const { products, getCategories, loading } =
    useProducts();

  console.log("👀 Datos llegando desde el backend:", products);

  const [search, setSearch] = useState('');

  const [category, setCategory] =
    useState('Todos');

  const catalogRef = useRef(null);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const categories = getCategories();

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();

    // 1. Primero filtramos por categoría y búsqueda (tu lógica original)
    const filteredProducts = products.filter((p) => {
      const matchCategory =
        category === 'Todos' ||
        p.category === category;

      const matchSearch =
        !search ||
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower);

      return matchCategory && matchSearch;
    });

    // 2. Luego ordenamos para enviar los "sin stock" al fondo
    return filteredProducts.sort((a, b) => {
      const aSinStock = a.stock === 0;
      const bSinStock = b.stock === 0;

      if (aSinStock && !bSinStock) return 1;  // 'a' va después de 'b'
      if (!aSinStock && bSinStock) return -1; // 'a' va antes que 'b'
      return 0; // Mantienen su orden original si ambos tienen o no tienen stock
    });
  }, [products, category, search]);

  const featuredProducts = useMemo(() => {
    const featured = products.filter((p) => p.featured === true);
    
    return featured.sort((a, b) => {
      const aSinStock = a.stock === 0;
      const bSinStock = b.stock === 0;

      if (aSinStock && !bSinStock) return 1;
      if (!aSinStock && bSinStock) return -1;
      return 0;
    });
  }, [products]);

  const featuredSection =
    (loading || featuredProducts.length > 0) && (
      <Box
        sx={{
          py: 8,
          px: 3,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            mb: 5,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              mb: 1,
            }}
          >
            Productos destacados
          </Typography>

          <Typography
            color="text.secondary"
          >
            Nuestra selección especial
          </Typography>
        </Box>

        {/* --- AQUÍ REEMPLAZAMOS EL GRID POR EL CSS GRID --- */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)', // 1 columna en celulares
              sm: 'repeat(2, 1fr)', // 2 columnas en tablets
              md: 'repeat(3, 1fr)', // 3 columnas en laptops
              lg: 'repeat(4, 1fr)', // 4 columnas en PC de escritorio
            },
            gap: 4,
            alignItems: 'stretch'
          }}
        >
          {loading
            ? [...Array(4)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', height: '100%' }}>
                  <ProductCardSkeleton />
                </Box>
              ))
            : featuredProducts.map((product) => (
                <Box key={product.id} sx={{ display: 'flex', height: '100%' }}>
                  <ProductCard product={product} />
                </Box>
              ))}
        </Box>
      </Box>
    );

  const sectionsMap = {
    hero: (
      <HeroSection
        productsCount={products.length}
        search={search}
        setSearch={setSearch}
        scrollToCatalog={scrollToCatalog}
      />
    ),

    featured: featuredSection,

    catalog: (
      <CatalogSection
        catalogRef={catalogRef}
        categories={categories}
        category={category}
        setCategory={setCategory}
        filtered={filtered}
        loading={loading}
      />
    ),
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
      }}
    >
      {STORE_CONFIG.sections.map((section) => (
        <Box key={section}>
          {sectionsMap[section]}
        </Box>
      ))}
    </Box>
  );
}

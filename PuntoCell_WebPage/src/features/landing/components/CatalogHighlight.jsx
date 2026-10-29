import { Box, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Link } from 'react-router-dom'

import ProductCard from '../../catalogo/components/ProductCard'
import ProductCardSkeleton from '../../catalogo/components/ProductCardSkeleton'
import { useProducts } from '../../catalogo/context/ProductContext'
import { section, shell } from '../../../components/ui/publicStyles'

export default function CatalogHighlight() {
  const { products, loading } = useProducts()
  // Lo que se muestra acá es "lo que hay en el local ahora", no una selección
  // editorial: el flag `featured` del contexto era literalmente stock > 0.
  const disponibles = products.filter((p) => p.stock > 0).slice(0, 4)

  if (!loading && disponibles.length === 0) return null

  return (
    <Box component="section" id="disponibles" sx={section(true)}>
      <Box sx={shell}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          <Typography component="h2" sx={{ typography: 'd2' }}>
            Disponibles ahora
          </Typography>

          {/* La flecha que avanza 3px es la única coquetería de la página, y
              sólo donde hay puntero fino. */}
          <Box
            component={Link}
            to="/catalogo"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '.9375rem',
              lineHeight: 1,
              '& svg': {
                fontSize: 16,
                transition: 'transform 220ms cubic-bezier(.23,1,.32,1)',
              },
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover svg': { transform: 'translateX(3px)' },
              },
            }}
          >
            Ver todo el catálogo
            <ArrowForwardIcon />
          </Box>
        </Box>

        <Box
          sx={{
            mt: 'clamp(2.5rem, 4.5vw, 3.5rem)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 'clamp(1rem, 1.8vw, 1.5rem)',
            alignItems: 'stretch',
          }}
        >
          {loading
            ? [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
            : disponibles.map((p) => <ProductCard key={p.id} product={p} />)}
        </Box>
      </Box>
    </Box>
  )
}

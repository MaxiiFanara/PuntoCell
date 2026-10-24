import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  Pagination
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'

import ProductCard from '../components/ProductCard'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import CategoryFilter from '../components/CategoryFilter'
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs'

import { STORE_CONFIG } from '../config/store'
import { MONO, PUBLIC_CONTROL_H } from '../../../theme'
import { btn, DISPLAY, field, muted, SERIF } from '../../../components/ui/publicStyles'

const { catalog } = STORE_CONFIG

const ORDENES = [
  { valor: 'relevancia', label: 'Relevancia' },
  { valor: 'precio-asc', label: 'Menor precio' },
  { valor: 'precio-desc', label: 'Mayor precio' },
  { valor: 'nombre', label: 'Nombre (A-Z)' },
]

// Una sola definición de grilla para el listado y para los esqueletos: si no,
// el layout salta cuando terminan de cargar los productos.
const GRILLA = {
  mt: 4,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: 'clamp(1rem, 1.8vw, 1.5rem)',
  alignItems: 'stretch',
}

export default function CatalogSection({
  categories,
  products,
  filtros,
  setSearch,
  setCategory,
  setOrden,
  limpiar,
  filtered,
  totalFiltered,
  totalCount,
  loading,
  page,
  totalPages,
  onPageChange
}) {
  // El botón de limpiar la búsqueda desaparece al usarlo, y con él el foco. Se
  // devuelve al campo para no dejar al teclado en el body.
  const buscador = useRef(null)

  // Escalonado de entrada sólo al cargar y al cambiar de página; al filtrar o escribir
  // las tarjetas aparecen sin demora (es una acción frecuente y no debe sentirse lenta).
  const [escalonar, setEscalonar] = useState(true)
  useEffect(() => {
    if (loading) return undefined
    const t = setTimeout(() => setEscalonar(false), 900)
    return () => clearTimeout(t)
  }, [loading, page])
  const cambiarPagina = (e, valor) => {
    setEscalonar(true)
    onPageChange(e, valor)
  }

  const titulo = catalog.title.trim().split(/\s+/)

  const hayFiltros =
    filtros.search !== '' || filtros.category !== 'Todos'

  return (
    <>
      <CatalogBreadcrumbs />

      {/* Cabecera mínima: se entra directo al listado. El contador va a la
          derecha, alineado por línea base con el título. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 5.6vw, 4.5rem)',
            lineHeight: 0.98,
            letterSpacing: '-.04em',
          }}
        >
          {titulo.slice(0, -1).join(' ')}{titulo.length > 1 ? ' ' : ''}
          <Box
            component="span"
            sx={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.06em', letterSpacing: '-.02em', color: 'primary.main' }}
          >
            {titulo[titulo.length - 1]}
          </Box>
        </Typography>
        {!loading && (
          <Typography className="num" sx={{ ...muted, fontFamily: MONO, fontSize: '.8125rem', whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'primary.main' }}>
              ({totalFiltered === totalCount ? totalCount : `${totalFiltered} de ${totalCount}`})
            </Box>{' '}
            productos
          </Typography>
        )}
      </Box>

      {/* Los filtros no son una caja: un filete arriba, uno abajo y aire. */}
      <Box
        component="section"
        aria-label="Filtros del catálogo"
        sx={{
          mt: 4,
          py: 3,
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'grid',
          gap: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <TextField
            inputRef={buscador}
            placeholder="Buscar por nombre, modelo o categoría"
            value={filtros.search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            sx={{
              ...field,
              flex: '1 1 280px',
              maxWidth: { sm: 420 },
              // El placeholder por defecto de MUI es la tinta al 42%: no llega a
              // 4.5:1 y acá es la única pista de qué busca el campo.
              '& input::placeholder': { color: 'pc.textMuted', opacity: 1 },
              // Anillo suave al enfocar: el campo "se enciende" en vez de saltar de borde.
              '& .MuiOutlinedInput-root': {
                ...field['& .MuiOutlinedInput-root'],
                borderRadius: 99,
                transition: 'box-shadow 220ms cubic-bezier(.23,1,.32,1)',
                '&.Mui-focused': { boxShadow: '0 0 0 4px color-mix(in srgb, var(--pc-palette-primary-main) 16%, transparent)' },
              },
            }}
            slotProps={{
              htmlInput: { 'aria-label': 'Buscar productos' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ ...muted, fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: filtros.search !== '' && (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Limpiar búsqueda"
                      onClick={() => {
                        setSearch('')
                        buscador.current?.focus()
                      }}
                      sx={{
                        ...muted,
                        width: 30,
                        height: 30,
                        borderRadius: '6px',
                        transition: 'background-color 180ms ease, color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                        '&:active': { transform: 'scale(.94)' },
                        '@media (hover: hover) and (pointer: fine)': {
                          '&:hover': { bgcolor: 'pc.surfaceMuted', color: 'text.primary' },
                        },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            value={filtros.orden}
            onChange={(e) => setOrden(e.target.value)}
            sx={{
              ...field,
              width: 190,
              // El tema fija el alto del Select con `!important` para la densidad
              // del panel; en la vitrina el control mide 48 como todos los demás.
              '& .MuiSelect-select': {
                minHeight: `${PUBLIC_CONTROL_H}px !important`,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500,
              },
            }}
            slotProps={{ select: { 'aria-label': 'Ordenar productos' } }}
          >
            {ORDENES.map((o) => (
              <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Box>

        <CategoryFilter categories={categories} products={products} selected={filtros.category} onChange={setCategory} />

        {hayFiltros && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ ...muted, fontSize: '.8125rem' }}>Filtros activos:</Typography>
            {filtros.search !== '' && (
              <Chip
                size="small"
                label={`Búsqueda: ${filtros.search}`}
                onDelete={() => setSearch('')}
                sx={{ height: 28, fontSize: '.8125rem' }}
              />
            )}
            {filtros.category !== 'Todos' && (
              <Chip
                size="small"
                label={`Categoría: ${filtros.category}`}
                onDelete={() => setCategory('Todos')}
                sx={{ height: 28, fontSize: '.8125rem' }}
              />
            )}
            <Button size="small" onClick={limpiar} sx={{ fontSize: '.8125rem', minWidth: 0, px: 1 }}>
              Limpiar todo
            </Button>
          </Box>
        )}
      </Box>

      {loading ? (
        <Box sx={GRILLA}>
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </Box>
      ) : filtered.length === 0 ? (
        // Sin ícono grande: el aire y la tipografía hacen el trabajo.
        <Box sx={{ py: 'clamp(4rem, 9vw, 7rem)', textAlign: 'center' }}>
          <Typography component="h2" variant="d3" sx={{ mb: 1.5 }}>
            {catalog.emptyState.title}
          </Typography>
          <Typography variant="publicBody" sx={{ ...muted, display: 'block', maxWidth: '42ch', mx: 'auto' }}>
            {catalog.emptyState.subtitle}
          </Typography>
          {hayFiltros && (
            <Button variant="outlined" onClick={limpiar} sx={{ ...btn, mt: 4 }}>
              Limpiar filtros
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Box sx={GRILLA}>
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} retraso={escalonar ? Math.min(i, 11) * 40 : 0} />
            ))}
          </Box>
          
          {/* Controles de paginación al final de la grilla */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={cambiarPagina}
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontFamily: MONO,
                    fontWeight: 500,
                    borderRadius: '12px',
                    transition: 'background-color 180ms ease, color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                    '&:active': { transform: 'scale(.95)' },
                  },
                  // Igual que la categoría activa: tinta plena, no verde.
                  '& .MuiPaginationItem-root.Mui-selected': {
                    bgcolor: 'text.primary',
                    color: 'background.default',
                    '&:hover': { bgcolor: 'text.primary' },
                  },
                }}
              />
            </Box>
          )}
        </>
      )}
    </>
  )
}
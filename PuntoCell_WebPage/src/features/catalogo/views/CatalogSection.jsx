import { useEffect, useMemo, useRef, useState } from 'react'
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
import CategoryRail from '../components/CategoryRail'
import CatalogHero from '../components/CatalogHero'
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs'

import { STORE_CONFIG } from '../config/store'
import { MONO } from '../../../theme'
import { btn, muted } from '../../../components/ui/publicStyles'

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
  mt: 3,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: 'clamp(1rem, 1.8vw, 1.5rem)',
  alignItems: 'stretch',
}

const SOMBRA_CONTROL = '0 2px 8px rgba(0,0,0,.06)'

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

  const hayFiltros =
    filtros.search !== '' || filtros.category !== 'Todos'

  // Sin filtros ni orden elegido, el catálogo se muestra por categoría (una fila por cada una).
  // Cualquier búsqueda, categoría u orden vuelve al listado plano con paginación de siempre.
  const agrupado = filtros.category === 'Todos' && filtros.search.trim() === '' && filtros.orden === 'relevancia'

  const grupos = useMemo(
    () =>
      categories
        .filter((c) => c !== 'Todos')
        .map((categoria) => ({ categoria, items: products.filter((p) => p.category === categoria) }))
        .filter((g) => g.items.length > 0),
    [categories, products],
  )

  // Las tarjetas flotantes de la cabecera: una por categoría y, si faltan, las que sigan.
  const destacados = useMemo(() => {
    const conFoto = products.filter((p) => p.imagenPortada)
    const porCategoria = grupos.map((g) => conFoto.find((p) => p.category === g.categoria)).filter(Boolean)
    const resto = conFoto.filter((p) => !porCategoria.includes(p))
    return [...porCategoria, ...resto].slice(0, 4)
  }, [products, grupos])

  const verCategoria = (categoria) => {
    setCategory(categoria)
    const el = document.getElementById('catalogo-lista')
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
  }

  return (
    <>
      <CatalogBreadcrumbs />

      <CatalogHero titulo={catalog.title} destacados={loading ? [] : destacados}>
        <Box sx={{ display: 'grid', gap: 2.5, justifyItems: 'center' }}>
          <TextField
            inputRef={buscador}
            placeholder="Buscar por nombre, modelo o categoría"
            value={filtros.search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            sx={{
              width: 'min(100%, 520px)',
              '& .MuiOutlinedInput-root': {
                height: 56,
                pl: 2.5,
                pr: 0.75,
                borderRadius: 99,
                bgcolor: 'background.paper',
                fontSize: '1rem',
                letterSpacing: '-.014em',
                boxShadow: SOMBRA_CONTROL,
                transition: 'box-shadow 220ms cubic-bezier(.23,1,.32,1)',
                '& fieldset': { borderColor: 'color-mix(in srgb, var(--pc-palette-text-primary) 10%, transparent)' },
                '&:hover fieldset': { borderColor: 'color-mix(in srgb, var(--pc-palette-text-primary) 18%, transparent)' },
                '&.Mui-focused': { boxShadow: '0 0 0 4px color-mix(in srgb, var(--pc-palette-primary-main) 16%, transparent)' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
              },
              '& .MuiOutlinedInput-input': { py: 0, height: '100%' },
              // El placeholder por defecto de MUI es la tinta al 42%: no llega a
              // 4.5:1 y acá es la única pista de qué busca el campo.
              '& input::placeholder': { color: 'pc.textMuted', opacity: 1 },
            }}
            slotProps={{
              htmlInput: { 'aria-label': 'Buscar productos' },
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={{ gap: 0.5, ml: 0 }}>
                    {filtros.search !== '' && (
                      <IconButton
                        aria-label="Limpiar búsqueda"
                        onClick={() => {
                          setSearch('')
                          buscador.current?.focus()
                        }}
                        sx={{
                          ...muted,
                          width: 32,
                          height: 32,
                          transition: 'background-color 180ms ease, color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                          '&:active': { transform: 'scale(.92)' },
                          '@media (hover: hover) and (pointer: fine)': {
                            '&:hover': { bgcolor: 'pc.surfaceMuted', color: 'text.primary' },
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    )}
                    {/* El botón verde es decorativo: la búsqueda ya se aplica al escribir. */}
                    <Box
                      aria-hidden
                      sx={{
                        width: 44,
                        height: 44,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        boxShadow: '0 4px 24px color-mix(in srgb, var(--pc-palette-primary-main) 40%, transparent)',
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 22 }} />
                    </Box>
                  </InputAdornment>
                ),
              },
            }}
          />

          <CategoryFilter categories={categories} products={products} selected={filtros.category} onChange={setCategory} />

          {hayFiltros && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
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
      </CatalogHero>

      {/* Contador a la izquierda y orden a la derecha. */}
      <Box
        id="catalogo-lista"
        sx={{
          mt: { xs: 4, md: 5 },
          scrollMarginTop: '96px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {!loading ? (
          <Typography className="num" sx={{ ...muted, fontFamily: MONO, fontSize: '.8125rem' }}>
            <Box component="span" sx={{ color: 'primary.main' }}>
              ({totalFiltered === totalCount ? totalCount : `${totalFiltered} de ${totalCount}`})
            </Box>{' '}
            productos
          </Typography>
        ) : (
          <span />
        )}

        <TextField
          select
          value={filtros.orden}
          onChange={(e) => setOrden(e.target.value)}
          sx={{
            width: 190,
            '& .MuiOutlinedInput-root': {
              borderRadius: 99,
              bgcolor: 'background.paper',
              boxShadow: SOMBRA_CONTROL,
              fontSize: '.9375rem',
              '& fieldset': { border: 0 },
            },
            // El tema fija el alto del Select con `!important` para la densidad
            // del panel; en la vitrina el control mide 44.
            '& .MuiSelect-select': {
              minHeight: '44px !important',
              pl: 2.25,
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

      {loading ? (
        <Box sx={GRILLA}>
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </Box>
      ) : agrupado && grupos.length > 0 ? (
        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'clamp(2.5rem, 5vw, 4rem)' }}>
          {grupos.map((g) => (
            <CategoryRail
              key={g.categoria}
              categoria={g.categoria}
              productos={g.items}
              onVerTodo={verCategoria}
              escalonar={escalonar}
            />
          ))}
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
                    borderRadius: '99px',
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

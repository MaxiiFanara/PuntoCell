import { useRef } from 'react'
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'

import ProductCard from '../components/ProductCard'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import CategoryFilter from '../components/CategoryFilter'
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs'

import { STORE_CONFIG } from '../config/store'
import { PUBLIC_CONTROL_H } from '../../../theme'
import { btn, field, muted } from '../../../components/ui/publicStyles'

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

// El switch encendido se llena con la tinta del texto, no con el verde: el verde
// está reservado al precio, la acción primaria y el anillo de foco.
const switchTinta = {
  width: 42,
  height: 24,
  p: 0,
  '& .MuiSwitch-switchBase': {
    p: '3px',
    color: 'background.paper',
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      color: 'background.paper',
      '& + .MuiSwitch-track': { bgcolor: 'text.primary', opacity: 1 },
    },
  },
  '& .MuiSwitch-thumb': { width: 18, height: 18, boxShadow: '0 1px 2px rgba(0,0,0,.2)' },
  '& .MuiSwitch-track': { borderRadius: 99, bgcolor: 'divider', opacity: 1 },
}

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
  // El botón de limpiar la búsqueda desaparece al usarlo, y con él el foco. Se
  // devuelve al campo para no dejar al teclado en el body.
  const buscador = useRef(null)

  const hayFiltros =
    filtros.search !== '' || filtros.category !== 'Todos' || filtros.soloStock

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
        <Typography component="h1" variant="d2">
          {catalog.title}
        </Typography>
        {!loading && (
          <Typography className="num" sx={{ ...muted, fontSize: '.875rem', whiteSpace: 'nowrap' }}>
            {filtered.length === totalCount
              ? `${totalCount} productos`
              : `${filtered.length} de ${totalCount}`}
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

          <FormControlLabel
            control={
              <Switch
                checked={filtros.soloStock}
                onChange={(e) => setSoloStock(e.target.checked)}
                sx={switchTinta}
              />
            }
            label="Sólo con stock"
            slotProps={{ typography: { sx: { fontSize: '.9375rem', color: 'text.secondary' } } }}
            sx={{ height: PUBLIC_CONTROL_H, ml: 0, mr: 0, gap: 1.25 }}
          />
        </Box>

        <CategoryFilter categories={categories} selected={filtros.category} onChange={setCategory} />
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
        <Box sx={GRILLA}>
          {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
        </Box>
      )}
    </>
  )
}

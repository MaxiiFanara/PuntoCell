import { useMemo } from 'react'
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'

import { useProducts } from '../context/ProductContext'
import { formatCategoria } from '../utils/categorias'

/**
 * Píldoras de categoría.
 *
 * Sigue siendo un ToggleButtonGroup exclusivo: es el control correcto para "una
 * de varias" y ya trae el rol, el estado presionado y el manejo de teclado. Lo
 * que cambia es la escala y el relleno de la activa, que acá se llena con la
 * tinta del texto y NO con el verde: el verde es del precio, la acción primaria
 * y el anillo de foco, y una fila de píldoras verdes le saca el trabajo al
 * precio de la card.
 */
const pildora = (t) => ({
  height: 36,
  px: 1.875,
  gap: 0.75,
  fontSize: '.875rem',
  fontWeight: 500,
  color: t.vars.palette.text.secondary,
  background: t.vars.palette.background.paper,
  transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
  '&:active': { transform: 'scale(.97)' },
  // El tema estila el hover sin condición; acá queda neutralizado y se vuelve a
  // declarar sólo donde hay puntero fino.
  '&:hover': { background: t.vars.palette.background.paper, color: t.vars.palette.text.secondary },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      borderColor: `${t.vars.palette.text.disabled} !important`,
      color: t.vars.palette.text.primary,
      background: t.vars.palette.background.paper,
    },
  },
  '&.Mui-selected': {
    background: t.vars.palette.text.primary,
    color: t.vars.palette.background.default,
    borderColor: `${t.vars.palette.text.primary} !important`,
    // La activa no reacciona al hover: ya está en su estado final.
    '&:hover': {
      background: t.vars.palette.text.primary,
      color: t.vars.palette.background.default,
      borderColor: `${t.vars.palette.text.primary} !important`,
    },
  },
})

export default function CategoryFilter({ categories, products: productos, selected, onChange }) {
  const { products: todos } = useProducts()
  // El catálogo pasa solo los productos con stock; sin esa prop se usa el catálogo completo.
  const products = productos ?? todos

  // La cuenta sale del catálogo completo, no del listado ya filtrado: si saliera
  // de ahí, elegir una categoría dejaría a todas las demás en cero.
  const cuentas = useMemo(() => {
    const acumulado = { Todos: products.length }
    for (const p of products) acumulado[p.category] = (acumulado[p.category] || 0) + 1
    return acumulado
  }, [products])

  return (
    // En pantallas angostas las píldoras se deslizan en una sola fila en vez de apilarse.
    <Box sx={{ overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 0.5, md: 0 }, mx: { xs: -1, md: 0 }, px: { xs: 1, md: 0 } }}>
    <ToggleButtonGroup
      exclusive
      value={selected}
      // `null` llega al deseleccionar la activa: se ignora para que siempre
      // haya exactamente una categoría vigente.
      onChange={(_, valor) => valor !== null && onChange(valor)}
      aria-label="Filtrar por categoría"
      sx={{ gap: 1, flexWrap: { xs: 'nowrap', md: 'wrap' }, '& .MuiToggleButton-root': { flex: 'none' } }}
    >
      {categories.map((cat) => (
        <ToggleButton key={cat} value={cat} sx={pildora}>
          {cat === 'Todos' ? cat : formatCategoria(cat)}
          {cuentas[cat] > 0 && (
            <Box component="span" className="mono" sx={{ fontSize: '.75rem', opacity: 0.65 }}>
              {cuentas[cat]}
            </Box>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
    </Box>
  )
}

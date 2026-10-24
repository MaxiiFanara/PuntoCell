import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  // Por encima del indicador que se desliza (ver abajo).
  position: 'relative',
  zIndex: 1,
  '&.Mui-selected': {
    // El relleno lo pone el indicador deslizante: así el color viaja de una píldora a la
    // otra en un solo movimiento en vez de apagarse y encenderse por separado.
    background: 'transparent',
    color: t.vars.palette.background.default,
    borderColor: 'transparent !important',
    // La activa no reacciona al hover: ya está en su estado final.
    '&:hover': {
      background: 'transparent',
      color: t.vars.palette.background.default,
      borderColor: 'transparent !important',
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

  // Indicador: un solo elemento que se desliza hasta la píldora activa.
  const grupo = useRef(null)
  const [marca, setMarca] = useState(null)
  useLayoutEffect(() => {
    const el = grupo.current
    if (!el) return undefined
    const medir = () => {
      const activa = el.querySelector('.Mui-selected')
      if (!activa) return setMarca(null)
      setMarca((prev) =>
        prev && prev.x === activa.offsetLeft && prev.w === activa.offsetWidth && prev.h === activa.offsetHeight
          ? prev
          : { x: activa.offsetLeft, y: activa.offsetTop, w: activa.offsetWidth, h: activa.offsetHeight },
      )
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selected, categories])

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
      ref={grupo}
      sx={{ position: 'relative', gap: 1, flexWrap: { xs: 'nowrap', md: 'wrap' }, '& .MuiToggleButton-root': { flex: 'none' } }}
    >
      {marca && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: marca.w,
            height: marca.h,
            borderRadius: '18px',
            bgcolor: 'text.primary',
            pointerEvents: 'none',
            transform: `translate(${marca.x}px, ${marca.y}px)`,
            transition:
              'transform 280ms cubic-bezier(.77,0,.175,1), width 280ms cubic-bezier(.77,0,.175,1)',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      )}
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

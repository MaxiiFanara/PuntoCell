import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'

import { useProducts } from '../context/ProductContext'
import { formatCategoria } from '../utils/categorias'
import CategoriaIcon from './CategoriaIcon'

/**
 * Píldoras de categoría.
 *
 * Sigue siendo un ToggleButtonGroup exclusivo: es el control correcto para "una de varias" y
 * ya trae el rol, el estado presionado y el manejo de teclado. Lo que cambia es la forma: píldora
 * blanca con sombra suave (sin borde), un ícono de categoría a la izquierda y un indicador que se
 * desliza hasta la activa, que se llena con la tinta del texto y NO con el verde (el verde es del
 * precio, la acción primaria y el anillo de foco).
 */
const pildora = (t) => ({
  height: 44,
  pl: 0.75,
  pr: 1.75,
  gap: 1,
  fontSize: '.9375rem',
  fontWeight: 500,
  letterSpacing: '-.014em',
  color: t.vars.palette.text.primary,
  background: t.vars.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,.06)',
  transition: 'background-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
  '&:active': { transform: 'scale(.97)' },
  // El tema estila el hover sin condición; acá queda neutralizado y se vuelve a
  // declarar sólo donde hay puntero fino.
  '&:hover': { background: t.vars.palette.background.paper, color: t.vars.palette.text.primary },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,.12)', background: t.vars.palette.background.paper },
  },
  // Por encima del indicador que se desliza (ver abajo).
  position: 'relative',
  zIndex: 1,
  '&.Mui-selected': {
    // El relleno lo pone el indicador deslizante: así el color viaja de una píldora a la
    // otra en un solo movimiento en vez de apagarse y encenderse por separado.
    background: 'transparent',
    color: t.vars.palette.background.default,
    boxShadow: 'none',
    '&:hover': { background: 'transparent', color: t.vars.palette.background.default, boxShadow: 'none' },
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
    <Box sx={{ width: { xs: 'calc(100% + 32px)', md: '100%' }, overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 1.5, md: 0 }, pt: { xs: 0.5, md: 0 }, mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
      <ToggleButtonGroup
        exclusive
        value={selected}
        // `null` llega al deseleccionar la activa: se ignora para que siempre
        // haya exactamente una categoría vigente.
        onChange={(_, valor) => valor !== null && onChange(valor)}
        aria-label="Filtrar por categoría"
        ref={grupo}
        sx={{
          position: 'relative',
          gap: 1,
          width: { xs: 'max-content', md: 'auto' },
          // En angosto la fila se desliza desde el principio; centrarla recortaría la primera píldora.
          mx: { xs: 0, md: 'auto' },
          justifyContent: { xs: 'flex-start', md: 'center' },
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          '& .MuiToggleButton-root': { flex: 'none', border: '0 !important', borderRadius: '99px !important' },
        }}
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
              borderRadius: 99,
              bgcolor: 'text.primary',
              pointerEvents: 'none',
              transform: `translate(${marca.x}px, ${marca.y}px)`,
              transition: 'transform 280ms cubic-bezier(.77,0,.175,1), width 280ms cubic-bezier(.77,0,.175,1)',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          />
        )}
        {categories.map((cat) => (
          <ToggleButton key={cat} value={cat} sx={pildora}>
            <Box
              aria-hidden
              component="span"
              sx={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: 'color-mix(in srgb, currentColor 10%, transparent)',
                transition: 'background-color 180ms ease',
              }}
            >
              {cat === 'Todos' ? (
                <AppsOutlinedIcon sx={{ fontSize: 17 }} />
              ) : (
                <CategoriaIcon categoria={cat} sx={{ fontSize: 17 }} />
              )}
            </Box>
            {cat === 'Todos' ? cat : formatCategoria(cat)}
            {cuentas[cat] > 0 && (
              <Box component="span" className="mono" sx={{ fontSize: '.75rem', opacity: 0.6 }}>
                {cuentas[cat]}
              </Box>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}

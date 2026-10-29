import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import ProductCard from './ProductCard'
import { formatCategoria } from '../utils/categorias'
import { DISPLAY, muted } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'

const ANCHO = 'clamp(248px, 24vw, 286px)'
const MAXIMO = 10

const plural = (c) => {
  const t = formatCategoria(c)
  return /s$/i.test(t) ? t : `${t}s`
}

/**
 * Fila horizontal de una categoría: encabezado con chevron (lleva al listado completo de esa
 * categoría), flechas circulares y una pista que se desliza con snap. Es sólo otra forma de
 * mostrar los mismos productos: el filtro de categoría sigue siendo el de siempre.
 */
export default function CategoryRail({ categoria, productos, onVerTodo, escalonar }) {
  const pista = useRef(null)
  const [borde, setBorde] = useState({ inicio: true, fin: false })

  const medir = useCallback(() => {
    const el = pista.current
    if (!el) return
    const inicio = el.scrollLeft <= 4
    const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setBorde((b) => (b.inicio === inicio && b.fin === fin ? b : { inicio, fin }))
  }, [])

  useEffect(() => {
    const el = pista.current
    if (!el) return undefined
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [medir, productos.length])

  const mover = (dir) => {
    const el = pista.current
    if (!el) return
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: suave ? 'smooth' : 'auto' })
  }

  const visibles = productos.slice(0, MAXIMO)
  const nombre = plural(categoria)

  const flecha = {
    width: 40,
    height: 40,
    bgcolor: 'background.paper',
    color: 'text.primary',
    boxShadow: '0 4px 24px rgba(0,0,0,.12)',
    transition: 'transform 160ms cubic-bezier(.23,1,.32,1), opacity 180ms ease, background-color 180ms ease',
    '&:active': { transform: 'scale(.94)' },
    '&.Mui-disabled': { opacity: 0.35, bgcolor: 'background.paper', color: 'text.primary' },
    '@media (hover: hover) and (pointer: fine)': { '&:hover:not(.Mui-disabled)': { bgcolor: 'background.paper', transform: 'scale(1.06)' } },
  }

  return (
    <Box component="section" aria-label={nombre}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
        <Box
          component="button"
          type="button"
          onClick={() => onVerTodo(categoria)}
          aria-label={`Ver todos los productos de ${nombre}`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0,
            border: 0,
            bgcolor: 'transparent',
            color: 'text.primary',
            cursor: 'pointer',
            font: 'inherit',
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(1.375rem, 2.4vw, 1.75rem)',
            letterSpacing: '-.04em',
            lineHeight: 1.1,
            borderRadius: 2,
            '& svg': { transition: 'transform 220ms cubic-bezier(.23,1,.32,1)' },
            '@media (hover: hover) and (pointer: fine)': { '&:hover svg': { transform: 'translateX(4px)' } },
          }}
        >
          {nombre}
          <ChevronRightIcon sx={{ fontSize: 26 }} />
          <Typography component="span" sx={{ ...muted, ml: 0.75, fontFamily: MONO, fontSize: '.8125rem', fontWeight: 500, letterSpacing: 0 }}>
            ({productos.length})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton aria-label={`${nombre}: anteriores`} disabled={borde.inicio} onClick={() => mover(-1)} sx={flecha}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label={`${nombre}: siguientes`} disabled={borde.fin} onClick={() => mover(1)} sx={flecha}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Márgenes negativos + padding: la sombra y el levantado de las tarjetas no se recortan. */}
      <Box
        ref={pista}
        onScroll={medir}
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 2,
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          scrollPaddingInline: 2,
          mx: -2,
          px: 2,
          pt: 1.5,
          pb: 4,
          mb: -2,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {visibles.map((product, i) => (
          <Box key={product.id} sx={{ flex: `0 0 ${ANCHO}`, scrollSnapAlign: 'start' }}>
            <ProductCard product={product} retraso={escalonar ? Math.min(i, 5) * 45 : 0} />
          </Box>
        ))}

        {productos.length > MAXIMO && (
          <Box sx={{ flex: '0 0 auto', scrollSnapAlign: 'start', display: 'flex' }}>
            <Box
              component="button"
              type="button"
              onClick={() => onVerTodo(categoria)}
              sx={{
                width: 'clamp(150px, 14vw, 190px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                p: 2,
                border: 0,
                borderRadius: '28px',
                bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 9%, var(--pc-palette-background-paper))',
                color: 'text.primary',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'transform 200ms cubic-bezier(.23,1,.32,1), background-color 200ms ease',
                '&:active': { transform: 'scale(.97)' },
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': { bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 16%, var(--pc-palette-background-paper))' },
                  '&:hover .ver-flecha': { transform: 'translateX(3px)' },
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: '0 4px 24px color-mix(in srgb, var(--pc-palette-primary-main) 40%, transparent)',
                }}
              >
                <ArrowForwardIcon className="ver-flecha" sx={{ transition: 'transform 220ms cubic-bezier(.23,1,.32,1)' }} />
              </Box>
              Ver los {productos.length}
              <Typography component="span" sx={{ ...muted, fontSize: '.8125rem', fontWeight: 400 }}>
                {nombre.toLowerCase()}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

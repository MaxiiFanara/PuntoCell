import { useEffect, useRef } from 'react'
import { Box, IconButton, Link as MuiLink, Tooltip, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import { Link } from 'react-router-dom'

import { useCart } from '../context/CartContext'
import { useCompare, esComparable } from '../context/CompareContext'
import { formatCurrency } from '../utils/whatsapp'
import { formatCategoria } from '../utils/categorias'
import ProductSpecs from './ProductSpecs'
import CategoriaIcon from './CategoriaIcon'
import ReflectiveCard from '../../../components/ui/ReflectiveCard'
import './fotoProducto.css'
import './catalogoUi.css'
import { DISPLAY, muted, price as priceSx } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'

/**
 * Card única de producto: la usan la grilla del catálogo y la vitrina de la landing.
 *
 * No lleva imagen. No hay campo de foto en la base y no lo va a haber en este
 * alcance, así que el nombre y el precio ocupan el lugar que tendría la
 * fotografía en vez de dejar un rectángulo gris con un ícono adentro. Si algún
 * día entra `imagen_url`, va arriba del nombre y el resto no se mueve.
 *
 * El nombre es el enlace real y su ::after cubre la card entera, así todo el
 * bloque es clickeable sin perder foco de teclado ni anidar interactivos. El
 * botón de agregar se dibuja por encima de ese ::after y sólo aparece donde hay
 * CartProvider (la landing no lo monta).
 */
export default function ProductCard({ product, retraso = 0 }) {
  const host = useRef(null)
  const brillo = useRef(null)

  // Brillo que sigue al cursor, con inercia (resorte simple). Decorativo: sólo mouse y sin
  // preferencia de menos movimiento. Escribe directo al elemento, sin pasar por React.
  useEffect(() => {
    const el = host.current
    const glow = brillo.current
    if (!el || !glow) return undefined
    if (!window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
      return undefined
    }
    const meta = { x: 0, y: 0 }
    const actual = { x: 0, y: 0 }
    let raf = 0
    let dentro = false

    const tick = () => {
      actual.x += (meta.x - actual.x) * 0.16
      actual.y += (meta.y - actual.y) * 0.16
      glow.style.setProperty('--x', `${actual.x.toFixed(1)}px`)
      glow.style.setProperty('--y', `${actual.y.toFixed(1)}px`)
      const lejos = Math.abs(meta.x - actual.x) + Math.abs(meta.y - actual.y) > 0.5
      raf = dentro && lejos ? requestAnimationFrame(tick) : 0
    }
    const mover = (e) => {
      const r = el.getBoundingClientRect()
      meta.x = e.clientX - r.left
      meta.y = e.clientY - r.top
      if (!dentro) {
        dentro = true
        actual.x = meta.x
        actual.y = meta.y
        glow.setAttribute('data-on', '')
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const salir = () => {
      dentro = false
      glow.removeAttribute('data-on')
    }
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
      cancelAnimationFrame(raf)
    }
  }, [])

  const cart = useCart()
  // La placa reflectante se tiñe según el modo del sitio.
  const { mode, systemMode } = useColorScheme()
  const oscuro = (mode === 'system' ? systemMode : mode) === 'dark'
  // Como el carrito, solo existe dentro del catálogo (la landing no lo monta).
  const compare = useCompare()
  const comparable = compare && esComparable(product)
  const enComparacion = comparable && compare.isSelected(product.id)

  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null
  const sinStock = stock === 0
  const ultimas = stock !== null && stock > 0 && stock <= 3

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : null

  const [enteros, decimales] = (() => {
    const t = formatCurrency(product.price)
    const i = t.lastIndexOf(',')
    return i === -1 ? [t, ''] : [t.slice(0, i), t.slice(i)]
  })()

  const stockTexto = sinStock
    ? 'Sin stock'
    : stock === null
      ? null
      : `${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`

  return (
    <Box
      ref={host}
      sx={{
        height: '100%',
        // Sin stock: la placa se apaga un poco, igual que antes se usaba el gris apagado.
        ...(sinStock && { '& .reflective-card__canvas': { opacity: 0.5 } }),
        '&:has(a:focus-visible) .reflective-card__body': {
          outline: '2px solid var(--pc-palette-primary-main)',
          outlineOffset: '2px',
        },
        // El botón de agregar aparece con la tarjeta (sólo puntero fino): sube 4px y se funde.
        '& .pc-add': { translate: '0 0' },
        '@media (hover: hover) and (pointer: fine)': {
          transition: 'transform 240ms cubic-bezier(.23,1,.32,1)',
          '&:hover': { transform: 'translateY(-3px)' },
          '& .pc-add': { translate: '0 4px' },
          '&:hover .pc-add, & .pc-add:focus-visible': { opacity: 1, translate: '0 0' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '@media (hover: hover) and (pointer: fine)': { '&:hover': { transform: 'none' } },
        },
      }}
      // Toda la tarjeta es el anfitrión del efecto de la foto (ver fotoProducto.css).
      className="pc-foto-host pc-card-in"
      style={retraso ? { '--pc-retraso': `${retraso}ms` } : undefined}
    >
      <ReflectiveCard
        theme={oscuro ? 'dark' : 'light'}
        tint={oscuro ? '#9be3c3' : '#e8f4ee'}
        metalness={0.35}
        roughness={0.55}
        blurStrength={6}
        shine={0.6}
        glare={0.45}
        warp={0.5}
        bevel={3}
        tiltStrength={6}
        radius={22}
        width="100%"
        height="100%"
      >
        <span ref={brillo} className="pc-brillo" aria-hidden="true" />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
          {/* Escenario de la foto. Las fotos traen fondo blanco opaco: con `multiply` el blanco
              toma el color del escenario y el producto queda apoyado en un halo, no en una caja. */}
          <Box
            className="pc-img"
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              mb: 2.25,
              borderRadius: '14px',
              overflow: 'hidden',
              background: oscuro
                ? 'radial-gradient(ellipse 80% 75% at 50% 42%, #f4f7f5 0%, #c3d8cd 100%)'
                : 'radial-gradient(ellipse 80% 75% at 50% 42%, #ffffff 0%, #dcebe3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // El blend va en el grupo que flota (no en la <img>): una <img> con transform en hover pierde el multiply.
              '& .pc-foto__flota': { mixBlendMode: 'multiply' },
            }}
          >
            {product.imagenPortada ? (
              <span className="pc-foto">
                <span className="pc-foto__flota">
                  <img className="pc-foto__img" src={product.imagenPortada} alt={product.name} loading="lazy" />
                </span>
                <span className="pc-foto__sombra" aria-hidden="true" />
              </span>
            ) : (
              <CategoriaIcon categoria={product.category} sx={{ fontSize: 56, color: 'primary.main', opacity: 0.5 }} />
            )}

            {ultimas && (
              <Typography
                component="span"
                sx={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  px: 1.1,
                  py: 0.6,
                  borderRadius: '4px 12px 4px 12px',
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  fontSize: '.6875rem',
                  fontWeight: 600,
                  lineHeight: 1,
                  transform: 'rotate(-2deg)',
                  boxShadow: '0 6px 14px -8px rgba(0,0,0,.5)',
                }}
              >
                Últimas unidades
              </Typography>
            )}

            {/* `esSerializado` llega del endpoint como la promoción "Único": es una
                unidad con IMEI propio, no un artículo de stock a granel. */}
            {product.promotions?.includes('Único') && (
              <Typography
                component="span"
                className="mono"
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: '.6875rem',
                  px: 0.9,
                  py: 0.5,
                  borderRadius: 99,
                  lineHeight: 1,
                  bgcolor: 'rgba(255,255,255,.78)',
                  color: '#1d1b18',
                  border: '1px solid rgba(29,27,24,.14)',
                }}
              >
                Único
              </Typography>
            )}
          </Box>

          <Typography
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              fontFamily: MONO,
              fontSize: '.6875rem',
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'pc.textMuted',
            }}
          >
            <Box aria-hidden component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
            {formatCategoria(product.category)}
          </Typography>

          <Typography
            component="h3"
            sx={{
              mt: 1.25,
              fontFamily: DISPLAY,
              fontSize: '1.1875rem',
              fontWeight: 700,
              lineHeight: 1.22,
              letterSpacing: '-.025em',
            }}
          >
            <MuiLink
              component={Link}
              to={`/catalogo/product/${product.id}`}
              underline="none"
              sx={{
                color: 'inherit',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                // Cubre la card entera: un solo destino, un solo elemento enfocable.
                '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit' },
              }}
            >
              {product.name}
            </MuiLink>
          </Typography>

          {discount && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
              <Typography className="mono" sx={{ ...muted, fontSize: '.8125rem', textDecoration: 'line-through' }}>
                ${formatCurrency(product.comparePrice)}
              </Typography>
              <Typography
                component="span"
                className="mono"
                sx={{
                  px: 0.75,
                  py: 0.4,
                  borderRadius: 99,
                  fontSize: '.6875rem',
                  fontWeight: 500,
                  lineHeight: 1,
                  color: 'primary.main',
                  bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
                }}
              >
                -{discount}%
              </Typography>
            </Box>
          )}

          <Typography
            sx={{
              ...priceSx(),
              fontSize: '1.75rem',
              mt: discount ? 0.5 : 1.5,
              ...(sinStock && { color: 'text.secondary' }),
            }}
          >
            ${enteros}
            <Box component="span" sx={{ fontSize: '.55em', opacity: 0.7, ml: 0 }}>
              {decimales}
            </Box>
          </Typography>

          <ProductSpecs product={product} compacto />

          <Box
            sx={{
              mt: 'auto',
              pt: 2.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            {stockTexto && (
              <Typography
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.875,
                  fontSize: '.8125rem',
                  color: sinStock ? 'pc.textMuted' : ultimas ? 'warning.main' : 'text.secondary',
                  ...(ultimas && { fontWeight: 600 }),
                }}
              >
                <Box
                  aria-hidden
                  component="span"
                  sx={{
                    flex: 'none',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: sinStock ? 'text.disabled' : ultimas ? 'warning.main' : 'primary.main',
                  }}
                />
                {stockTexto}
              </Typography>
            )}

            {comparable && (
              <Tooltip title={enComparacion ? 'Quitar de la comparación' : compare.isFull ? 'Ya hay 3 productos para comparar' : 'Comparar'}>
                <Box component="span" sx={{ flex: 'none', ml: 'auto' }}>
                  <IconButton
                    onClick={() => compare.toggle(product.id)}
                    disabled={!enComparacion && compare.isFull}
                    aria-pressed={enComparacion}
                    aria-label={enComparacion ? `Quitar ${product.name} de la comparación` : `Comparar ${product.name}`}
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      width: 38,
                      height: 38,
                      border: 1,
                      borderColor: enComparacion ? 'primary.main' : 'divider',
                      borderRadius: 99,
                      color: enComparacion ? 'primary.contrastText' : 'text.primary',
                      bgcolor: enComparacion ? 'primary.main' : 'transparent',
                      transition: 'background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                      '&:active': { transform: 'scale(.94)' },
                      '&:hover': { bgcolor: enComparacion ? 'primary.dark' : undefined },
                    }}
                  >
                    <CompareArrowsIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}

            {cart && (
              <Tooltip title={sinStock ? 'Sin stock' : 'Agregar al carrito'}>
                {/* El span deja que el Tooltip funcione con el botón deshabilitado. */}
                <Box component="span" sx={{ flex: 'none', ml: comparable ? 0 : 'auto' }}>
                  <IconButton
                    className="pc-add"
                    disabled={sinStock}
                    onClick={() => cart.addToCart(product)}
                    aria-label={sinStock ? `${product.name}, sin stock` : `Agregar ${product.name} al carrito`}
                    sx={{
                      // Por encima del ::after del enlace, si no el click cae en la card.
                      position: 'relative',
                      zIndex: 1,
                      width: 38,
                      height: 38,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 99,
                      color: 'text.primary',
                      transition: 'opacity 180ms ease, translate 240ms cubic-bezier(.23,1,.32,1), background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                      '&:active': { transform: 'scale(.92)' },
                      // En puntero fino aparece en hover; en táctil está siempre,
                      // porque no hay hover que lo revele.
                      '@media (hover: hover) and (pointer: fine)': {
                        opacity: 0,
                        '&:hover:not(.Mui-disabled)': {
                          bgcolor: 'primary.main',
                          borderColor: 'primary.main',
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
      </ReflectiveCard>
    </Box>
  )
}

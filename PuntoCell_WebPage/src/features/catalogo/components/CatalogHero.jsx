import { Box, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

import { formatCurrency } from '../utils/whatsapp'
import { DISPLAY, SERIF } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'
import './catalogoUi.css'

// Posiciones de la "constelación": cada tarjeta flota en su lugar, apenas inclinada. En
// pantallas anchas rodean el título; en angostas pasan a una fila superpuesta (ver abajo).
const LUGARES = [
  { left: '0.5%', top: 70, rot: -7, w: '13.5%', demora: '0s', z: 1 },
  { left: '13.5%', top: 18, rot: 5, w: '12.5%', demora: '-2.2s', z: 2 },
  { right: '13.5%', top: 14, rot: 6, w: '12.5%', demora: '-4.1s', z: 2 },
  { right: '0.5%', top: 76, rot: -5, w: '13.5%', demora: '-1.3s', z: 1 },
]

function TarjetaFlotante({ product, estilo = {} }) {
  const [enteros, decimales] = (() => {
    const t = formatCurrency(product.price)
    const i = t.lastIndexOf(',')
    return i === -1 ? [t, ''] : [t.slice(0, i), t.slice(i)]
  })()

  return (
    <Box
      component={Link}
      to={`/catalogo/product/${product.id}`}
      aria-label={`${product.name}, $${formatCurrency(product.price)}`}
      className="pc-foto-host"
      sx={{
        display: 'block',
        p: 0.75,
        borderRadius: '24px',
        bgcolor: 'background.paper',
        color: 'text.primary',
        textDecoration: 'none',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
        transition: 'box-shadow 240ms cubic-bezier(.23,1,.32,1), transform 240ms cubic-bezier(.23,1,.32,1)',
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,.16)', transform: 'translateY(-3px)' },
        },
        ...estilo,
      }}
    >
      <Box
        sx={{
          aspectRatio: '1 / 1',
          borderRadius: '18px',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 75% at 50% 42%, #ffffff 0%, #e6eeea 100%)',
          '& .pc-foto__flota': { mixBlendMode: 'multiply' },
        }}
      >
        <span className="pc-foto">
          <span className="pc-foto__flota">
            <img className="pc-foto__img" src={product.imagenPortada} alt="" loading="lazy" />
          </span>
        </span>
      </Box>
      <Box sx={{ px: 1, pt: 1, pb: 0.75 }}>
        <Typography
          noWrap
          sx={{ fontFamily: DISPLAY, fontSize: '.8125rem', fontWeight: 700, letterSpacing: '-.025em', lineHeight: 1.25 }}
        >
          {product.name}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '.75rem', color: 'primary.main', mt: 0.25 }}>
          ${enteros}
          <Box component="span" sx={{ opacity: 0.7 }}>{decimales}</Box>
        </Typography>
      </Box>
    </Box>
  )
}

/**
 * Cabecera del catálogo: el título al centro rodeado de tarjetas de productos flotando
 * (enlaces reales al detalle) y, debajo, lo que reciba en `children` (buscador y categorías).
 */
export default function CatalogHero({ titulo, destacados = [], children }) {
  const palabras = titulo.trim().split(/\s+/)
  const [a, b] = [palabras.slice(0, -1).join(' '), palabras[palabras.length - 1]]
  const flotantes = destacados.slice(0, 4)

  return (
    <Box sx={{ position: 'relative', textAlign: 'center', pt: { xs: 1, md: 0 }, pb: { xs: 1, md: 2 }, minHeight: { md: 350 } }}>
      {flotantes.length > 0 && (
        <>
          {/* Pantallas anchas: la constelación rodea el título. */}
          <Box
            sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {flotantes.map((p, i) => {
              const l = LUGARES[i]
              return (
                <Box
                  key={p.id}
                  sx={{
                    position: 'absolute',
                    ...(l.left && { left: l.left }),
                    ...(l.right && { right: l.right }),
                    top: l.top,
                    width: l.w,
                    zIndex: l.z,
                    pointerEvents: 'auto',
                  }}
                >
                  <Box className="pc-flota" style={{ '--pc-flota-delay': l.demora }} sx={{ rotate: `${l.rot}deg` }}>
                    <TarjetaFlotante product={p} />
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Pantallas angostas: tres tarjetas superpuestas en fila. */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3, mt: 1 }}>
            {flotantes.slice(0, 3).map((p, i) => (
              <Box
                key={p.id}
                className="pc-flota"
                style={{ '--pc-flota-delay': `${-i * 1.7}s` }}
                sx={{ width: 'min(30vw, 132px)', ml: i ? '-14px' : 0, rotate: `${[-6, 3, 7][i]}deg`, mt: i === 1 ? 2 : 0, zIndex: i === 1 ? 2 : 1 }}
              >
                <TarjetaFlotante product={p} />
              </Box>
            ))}
          </Box>
        </>
      )}

      <Box sx={{ position: 'relative', zIndex: 3, pt: { md: '88px' } }}>
        <Typography
          component="h1"
          sx={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 'clamp(2.75rem, 6vw, 4.75rem)',
            lineHeight: 0.98,
            letterSpacing: '-.045em',
          }}
        >
          {a}
          {a && ' '}
          <Box
            component="span"
            sx={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.06em', letterSpacing: '-.02em', color: 'primary.main' }}
          >
            {b}
          </Box>
        </Typography>
        <Box sx={{ mt: { xs: 3, md: 4.5 } }}>{children}</Box>
      </Box>
    </Box>
  )
}

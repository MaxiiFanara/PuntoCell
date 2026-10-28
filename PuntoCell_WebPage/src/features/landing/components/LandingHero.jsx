import { Box, Button, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { Link } from 'react-router-dom'

import { STORE_CONFIG } from '../../catalogo/config/store'
import CategoriaIcon from '../../catalogo/components/CategoriaIcon'
import ProductMedia from '../../catalogo/components/ProductMedia'
import { enter, shell } from '../../../components/ui/publicStyles'
import { Acento } from './Tipografia'
import { boton, CREMA, DISPLAY, ESQUEMA_OSCURO, LIMA, LIMA_HOVER, MENTA, MONO, NOCHE } from '../landingTokens'

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`
const CONSULTA_URL = `${whatsappUrl}?text=${encodeURIComponent('Hola! Quiero consultar por el iPhone 18 Pro Max')}`

const PERKS = ['Garantía del local', 'Tomamos tu usado', 'Pagá online']

/**
 * Apertura de la landing: bienvenida sobre un fondo aurora y el iPhone 3D como
 * protagonista. Siempre oscura (identidad de la apertura), con el texto en blanco
 * sobre un velo que garantiza contraste aunque el shader brille.
 */
export default function LandingHero() {
  return (
    <Box component="section" aria-labelledby="hero-titulo" {...ESQUEMA_OSCURO} sx={{ color: '#fff' }}>
      <Box sx={{ minHeight: 'calc(100svh - 72px)' }}>
        <Box
          sx={{
            minHeight: 'calc(100svh - 72px)',
            display: 'flex',
            alignItems: 'center',
            background:
              'linear-gradient(90deg, rgba(4,18,13,.78) 0%, rgba(4,18,13,.35) 55%, transparent 100%)',
          }}
        >
          <Box
            sx={{
              ...shell,
              py: 'clamp(3rem, 7vw, 6rem)',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
              alignItems: 'center',
              columnGap: 'clamp(1.5rem, 3vw, 3rem)',
              rowGap: 'clamp(2rem, 6vw, 3rem)',
            }}
          >
            <Box sx={{ gridColumn: { md: '1 / 8' } }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mb: 3.5,
                  fontFamily: MONO,
                  fontSize: '.8125rem',
                  fontWeight: 500,
                  letterSpacing: '.02em',
                  color: 'rgba(255,255,255,.78)',
                  ...enter(0),
                }}
              >
                <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MENTA }} />
                Punto Cell — La Calera, Córdoba
              </Box>

              <Typography
                id="hero-titulo"
                component="h1"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 'clamp(3rem, 7.4vw, 6.25rem)',
                  lineHeight: 0.94,
                  letterSpacing: '-.045em',
                  color: '#fff',
                }}
              >
                <span className="lp-linea" style={{ '--i': 0 }}>
                  <span>Bienvenido a</span>
                </span>
                <span className="lp-linea" style={{ '--i': 1 }}>
                  <span>
                    Punto <Acento color={MENTA}>Cell</Acento>
                  </span>
                </span>
              </Typography>

              <Typography
                sx={{
                  mt: 3.5,
                  maxWidth: '36ch',
                  fontSize: 'clamp(1.125rem, 1.7vw, 1.4rem)',
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,.86)',
                  ...enter(2),
                }}
              >
                Celulares, repuestos y servicio técnico en La Calera.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4.5, ...enter(3) }}>
                <Button
                  component={Link}
                  to="/catalogo"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    ...boton({ bg: LIMA, color: NOCHE, hoverBg: LIMA_HOVER }),
                    '& .MuiButton-endIcon': { transition: 'transform 220ms cubic-bezier(.23,1,.32,1)' },
                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': { bgcolor: LIMA_HOVER },
                      '&:hover .MuiButton-endIcon': { transform: 'translateX(3px)' },
                    },
                  }}
                >
                  Ver el catálogo
                </Button>
                <Button
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener"
                  startIcon={<WhatsAppIcon />}
                  sx={boton({
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.45)',
                    hoverBorder: '#fff',
                    hoverBg: 'rgba(255,255,255,.1)',
                  })}
                >
                  Escribinos
                </Button>
              </Box>

              <Box
                component="ul"
                sx={{
                  listStyle: 'none',
                  m: 0,
                  p: 0,
                  mt: 5.5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  fontFamily: MONO,
                  fontSize: '.75rem',
                  fontWeight: 500,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.72)',
                  ...enter(4),
                }}
              >
                {PERKS.map((texto, i) => (
                  <Box
                    component="li"
                    key={texto}
                    sx={{
                      display: 'inline-flex',
                      gap: 1.5,
                      ...(i > 0 && { '&::before': { content: '"/"', color: MENTA } }),
                    }}
                  >
                    {texto}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                gridColumn: { md: '8 / -1' },
                position: 'relative',
                height: { xs: 440, md: 'min(70vh, 640px)' },
                ...enter(2),
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: '6% -6%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(61,220,151,.38), transparent 66%)',
                  filter: 'blur(28px)',
                }}
              />
              <ProductMedia
                src="/models/iphone-18-pro-max.glb"
                alt="Modelo 3D del iPhone 18 Pro Max"
                interactive
                orientation="90deg 0deg 0deg"
                fallback={<CategoriaIcon categoria="Celulares" sx={{ fontSize: 120 }} />}
              />

              {/* Etiqueta de vitrina: fija (un botón que se mueve es difícil de tocar). */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 0, md: 8 },
                  left: { xs: 0, md: -12 },
                  p: 2,
                  pl: 2.5,
                  borderRadius: '6px 18px 6px 18px',
                  bgcolor: CREMA,
                  color: NOCHE,
                  transform: 'rotate(-3deg)',
                  boxShadow: '0 20px 40px -20px rgba(0,0,0,.7)',
                  transition: 'transform 220ms cubic-bezier(.23,1,.32,1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 12,
                    left: 9,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: NOCHE,
                  },
                  '@media (hover: hover) and (pointer: fine)': { '&:hover': { transform: 'rotate(-1deg)' } },
                }}
              >
                <Typography
                  sx={{ fontFamily: MONO, fontSize: '.6875rem', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0d5240' }}
                >
                  Destacado
                </Typography>
                <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.03em', mt: 0.25 }}>
                  iPhone 18 Pro Max
                </Typography>
                <Button
                  href={CONSULTA_URL}
                  target="_blank"
                  rel="noopener"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    ...boton({ bg: NOCHE, color: LIMA, hoverBg: '#0d2a20', height: 40 }),
                    mt: 1.25,
                    px: 2,
                    borderRadius: '10px',
                    fontSize: '.9375rem',
                  }}
                >
                  Consultar precio
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

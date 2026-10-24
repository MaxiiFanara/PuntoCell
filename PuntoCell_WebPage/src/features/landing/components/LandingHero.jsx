import { Box, Button, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import { Link } from 'react-router-dom'

import { STORE_CONFIG } from '../../catalogo/config/store'
import CategoriaIcon from '../../catalogo/components/CategoriaIcon'
import ProductMedia from '../../catalogo/components/ProductMedia'
import Velaris from '../../../components/ui/Velaris'
import { enter, shell } from '../../../components/ui/publicStyles'
import { DISPLAY, ESQUEMA_OSCURO, MENTA, NOCHE } from '../landingTokens'

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`
const CONSULTA_URL = `${whatsappUrl}?text=${encodeURIComponent('Hola! Quiero consultar por el iPhone 18 Pro Max')}`

const COLORES = ['#1f8a68', '#12684e', '#0d5240', NOCHE]

const PERKS = [
  { Icon: VerifiedUserOutlinedIcon, texto: 'Garantía del local' },
  { Icon: SwapHorizOutlinedIcon, texto: 'Tomamos tu usado' },
  { Icon: CreditCardOutlinedIcon, texto: 'Pagá online' },
]

const botonBase = {
  height: 54,
  px: 3.5,
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '14px',
  textTransform: 'none',
  letterSpacing: '-.005em',
  transition: 'transform 160ms cubic-bezier(.23,1,.32,1), background-color 180ms ease, border-color 180ms ease',
  '&:active': { transform: 'scale(.98)' },
}

/**
 * Apertura de la landing: bienvenida sobre un fondo aurora y el iPhone 3D como
 * protagonista. Siempre oscura (identidad de la apertura), con el texto en blanco
 * sobre un velo que garantiza contraste aunque el shader brille.
 */
export default function LandingHero() {
  return (
    <Box component="section" aria-labelledby="hero-titulo" {...ESQUEMA_OSCURO} sx={{ color: '#fff', bgcolor: NOCHE }}>
      <Velaris
        bg={NOCHE}
        colors={COLORES}
        speed={1}
        grain={0.22}
        height="auto"
        fallback={`radial-gradient(ellipse 80% 70% at 70% 40%, #12684e, ${NOCHE})`}
        sx={{ minHeight: 'calc(100svh - 72px)' }}
      >
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
                  gap: 1,
                  mb: 3,
                  px: 1.75,
                  py: 0.75,
                  borderRadius: 99,
                  border: '1px solid rgba(255,255,255,.24)',
                  bgcolor: 'rgba(255,255,255,.08)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '.8125rem',
                  fontWeight: 500,
                  ...enter(0),
                }}
              >
                <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MENTA }} />
                Punto Cell · La Calera, Córdoba
              </Box>

              <Typography
                id="hero-titulo"
                component="h1"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 'clamp(2.75rem, 6.6vw, 5.5rem)',
                  lineHeight: 0.96,
                  letterSpacing: '-.045em',
                  color: '#fff',
                }}
              >
                <Box component="span" sx={{ display: 'block', ...enter(0) }}>
                  Bienvenido a
                </Box>
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    ...enter(1),
                    background: `linear-gradient(100deg, #fff 10%, ${MENTA} 85%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Punto Cell
                </Box>
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
                    ...botonBase,
                    bgcolor: MENTA,
                    color: NOCHE,
                    '&:hover': { bgcolor: '#6ff0b8' },
                  }}
                >
                  Ver el catálogo
                </Button>
                <Button
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    ...botonBase,
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.45)',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.1)' },
                  }}
                >
                  Escribinos
                </Button>
              </Box>

              <Box
                component="ul"
                sx={{ listStyle: 'none', m: 0, p: 0, mt: 5, display: 'flex', flexWrap: 'wrap', gap: 1.25, ...enter(4) }}
              >
                {PERKS.map(({ Icon, texto }) => (
                  <Box
                    component="li"
                    key={texto}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.9,
                      borderRadius: 99,
                      bgcolor: 'rgba(255,255,255,.07)',
                      border: '1px solid rgba(255,255,255,.14)',
                      fontSize: '.875rem',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,.92)',
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: MENTA }} />
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

              <Box
                className="lp-float"
                sx={{
                  position: 'absolute',
                  top: { xs: 0, md: 8 },
                  left: { xs: 0, md: -12 },
                  p: 2,
                  borderRadius: '18px',
                  bgcolor: 'rgba(255,255,255,.09)',
                  border: '1px solid rgba(255,255,255,.2)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)',
                }}
              >
                <Typography
                  sx={{ fontSize: '.6875rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: MENTA }}
                >
                  Destacado
                </Typography>
                <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-.02em', mt: 0.25 }}>
                  iPhone 18 Pro Max
                </Typography>
                <Button
                  href={CONSULTA_URL}
                  target="_blank"
                  rel="noopener"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    mt: 1.25,
                    height: 40,
                    px: 2,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: MENTA,
                    color: NOCHE,
                    '&:hover': { bgcolor: '#6ff0b8' },
                  }}
                >
                  Consultar precio
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Velaris>
    </Box>
  )
}

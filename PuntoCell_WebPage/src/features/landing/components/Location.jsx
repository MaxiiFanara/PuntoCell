import { Box, Button, Typography } from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import DirectionsIcon from '@mui/icons-material/Directions'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

import { STORE_CONFIG } from '../../catalogo/config/store'
import { shell } from '../../../components/ui/publicStyles'
import { DISPLAY, ESQUEMA_OSCURO, MENTA, NOCHE } from '../landingTokens'

const { name, whatsapp, address, hours } = STORE_CONFIG.business

const consulta = address ? `${name} ${address} La Calera Córdoba` : `${name} La Calera Córdoba Argentina`
const mapaEmbed = `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed`
const mapaLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`

function Dato({ Icon, titulo, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
      <Box
        aria-hidden
        sx={{
          flex: 'none',
          width: 42,
          height: 42,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '12px',
          color: MENTA,
          bgcolor: 'rgba(61,220,151,.12)',
          border: '1px solid rgba(61,220,151,.28)',
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: '.8125rem', color: 'rgba(255,255,255,.62)' }}>{titulo}</Typography>
        <Typography sx={{ fontSize: '1.0625rem', fontWeight: 500, color: '#fff' }}>{children}</Typography>
      </Box>
    </Box>
  )
}

/** Bloque "Visitanos": el mapa ocupa el ancho y los datos flotan encima como una tarjeta de vidrio. */
export default function Location() {
  return (
    <Box
      component="section"
      id="visitanos"
      aria-labelledby="visitanos-titulo"
      {...ESQUEMA_OSCURO}
      sx={{ bgcolor: NOCHE, color: '#fff', py: 'clamp(4.5rem, 9vw, 8rem)' }}
    >
      <Box sx={shell}>
        <Typography
          sx={{ fontSize: '.8125rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MENTA }}
        >
          Dónde estamos
        </Typography>
        <Typography
          id="visitanos-titulo"
          component="h2"
          sx={{
            mt: 1.5,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            lineHeight: 1,
            letterSpacing: '-.04em',
          }}
        >
          Visitanos en el local
        </Typography>

        <Box
          sx={{
            position: 'relative',
            mt: 'clamp(2rem, 4vw, 3rem)',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.14)',
            minHeight: { xs: 0, md: 480 },
            display: { xs: 'flex', md: 'block' },
            flexDirection: 'column-reverse',
          }}
        >
          <Box
            component="iframe"
            title={`Mapa de ${name}`}
            src={mapaEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sx={{
              border: 0,
              display: 'block',
              width: '100%',
              height: { xs: 300, md: '100%' },
              position: { xs: 'static', md: 'absolute' },
              inset: 0,
              // El mapa de Google es claro: se invierte para que no desentone con la noche.
              filter: 'invert(.92) hue-rotate(180deg) saturate(.7) contrast(.92)',
            }}
          />

          <Box
            sx={{
              position: { xs: 'static', md: 'relative' },
              m: { md: 3 },
              maxWidth: { md: 400 },
              p: 'clamp(1.5rem, 3vw, 2rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.75,
              bgcolor: { xs: 'rgba(4,18,13,.96)', md: 'rgba(4,18,13,.78)' },
              backdropFilter: 'blur(16px)',
              borderRadius: { xs: 0, md: '18px' },
              border: { xs: 0, md: '1px solid rgba(255,255,255,.16)' },
            }}
          >
            <Dato Icon={PlaceOutlinedIcon} titulo="Dónde estamos">
              {address ? `${address}, La Calera, Córdoba` : 'La Calera, Córdoba, Argentina'}
            </Dato>

            {hours && (
              <Dato Icon={AccessTimeOutlinedIcon} titulo="Horarios">
                {hours}
              </Dato>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
              <Button
                href={mapaLink}
                target="_blank"
                rel="noopener"
                startIcon={<DirectionsIcon />}
                sx={{
                  height: 48,
                  px: 2.5,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: MENTA,
                  color: NOCHE,
                  '&:hover': { bgcolor: '#6ff0b8' },
                }}
              >
                Cómo llegar
              </Button>
              <Button
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener"
                startIcon={<WhatsAppIcon />}
                sx={{
                  height: 48,
                  px: 2.5,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,.4)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.08)' },
                }}
              >
                Escribinos
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

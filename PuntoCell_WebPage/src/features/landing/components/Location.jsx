import { Box, Button, Paper, Typography } from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import DirectionsIcon from '@mui/icons-material/Directions'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

import { STORE_CONFIG } from '../../catalogo/config/store'
import { btn, section, shell } from '../../../components/ui/publicStyles'

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
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '12px',
          color: 'primary.main',
          bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: '.8125rem', color: 'pc.textMuted' }}>{titulo}</Typography>
        <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>{children}</Typography>
      </Box>
    </Box>
  )
}

/** Bloque "Visitanos": dónde estamos, horarios (si se cargaron) y mapa. */
export default function Location() {
  return (
    <Box component="section" id="visitanos" sx={section(true)}>
      <Box sx={shell}>
        <Typography component="h2" sx={{ typography: 'd2' }}>
          Visitanos en el local
        </Typography>

        <Box
          sx={{
            mt: 'clamp(2.5rem, 5vw, 3.5rem)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
            <Dato Icon={PlaceOutlinedIcon} titulo="Dónde estamos">
              {address ? `${address}, La Calera, Córdoba` : 'La Calera, Córdoba, Argentina'}
            </Dato>

            {hours && (
              <Dato Icon={AccessTimeOutlinedIcon} titulo="Horarios">
                {hours}
              </Dato>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
              <Button
                variant="contained"
                href={mapaLink}
                target="_blank"
                rel="noopener"
                startIcon={<DirectionsIcon />}
                sx={btn}
              >
                Cómo llegar
              </Button>
              <Button
                variant="outlined"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener"
                startIcon={<WhatsAppIcon />}
                sx={btn}
              >
                Escribinos
              </Button>
            </Box>
          </Box>

          <Paper sx={{ borderRadius: 2, overflow: 'hidden', minHeight: { xs: 280, md: 340 } }}>
            <Box
              component="iframe"
              title={`Mapa de ${name}`}
              src={mapaEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sx={{ border: 0, width: '100%', height: '100%', minHeight: 'inherit', display: 'block' }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}

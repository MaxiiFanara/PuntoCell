import { Box, Paper, Typography } from '@mui/material'
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Link } from 'react-router-dom'

import { STORE_CONFIG } from '../../catalogo/config/store'
import { hoverLift, section, shell } from '../../../components/ui/publicStyles'

const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}`

const SERVICIOS = [
  {
    title: 'Equipos',
    Icon: SmartphoneOutlinedIcon,
    description: 'Nuevos y seminuevos verificados, con garantía del local y batería declarada.',
    cta: 'Ver equipos',
    to: '/catalogo',
  },
  {
    title: 'Servicio técnico',
    Icon: BuildOutlinedIcon,
    description: 'Reparaciones en el día. Cambio de batería, módulos y diagnóstico con repuestos de calidad.',
    cta: 'Consultar por WhatsApp',
    href: whatsappUrl,
  },
  {
    title: 'Accesorios',
    Icon: HeadphonesOutlinedIcon,
    description: 'Fundas, vidrios templados, cargadores originales y auriculares para cuidar tu equipo.',
    cta: 'Ver accesorios',
    to: '/catalogo',
  },
  {
    title: 'Garantía del local',
    Icon: VerifiedUserOutlinedIcon,
    description: 'En equipos nuevos y seminuevos.',
  },
  {
    title: 'Tomamos tu usado',
    Icon: SwapHorizOutlinedIcon,
    description: 'Como parte de pago.',
  },
  {
    title: 'Pagá online',
    Icon: CreditCardOutlinedIcon,
    description: 'Con Mercado Pago desde el catálogo.',
  },
]

const enlace = {
  mt: 'auto',
  pt: 3,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  color: 'primary.main',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '.9375rem',
  '& svg': { fontSize: 16, transition: 'transform 220ms cubic-bezier(.23,1,.32,1)' },
  '@media (hover: hover) and (pointer: fine)': { '&:hover svg': { transform: 'translateX(3px)' } },
}

/** Lo que se hace en el local: tres tarjetas con ícono y un enlace de acción. */
export default function Services() {
  return (
    <Box
      component="section"
      sx={{
        ...section(true),
        bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 5%, var(--pc-palette-background-default))',
      }}
    >
      <Box sx={shell}>
        <Typography component="h2" sx={{ typography: 'd2' }}>
          Lo que se hace en el local
        </Typography>
        <Typography sx={{ typography: 'publicBody', mt: 2, maxWidth: '46ch', color: 'text.secondary' }}>
          Calidad, confianza y atención personalizada.
        </Typography>

        <Box
          sx={{
            mt: 'clamp(2.5rem, 5vw, 4rem)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gridAutoRows: '1fr',
            gap: 'clamp(1rem, 2vw, 1.75rem)',
          }}
        >
          {SERVICIOS.map(({ title, Icon, description, cta, to, href }) => (
            <Paper
              key={title}
              sx={{ p: 'clamp(1.75rem, 2.5vw, 2.25rem)', borderRadius: 2, display: 'flex', flexDirection: 'column', ...hoverLift }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 52,
                  height: 52,
                  mb: 3,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '14px',
                  color: 'primary.main',
                  bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
                }}
              >
                <Icon sx={{ fontSize: 26 }} />
              </Box>
              <Typography component="h3" sx={{ typography: 'd3' }}>
                {title}
              </Typography>
              <Typography sx={{ typography: 'publicBody', mt: 1.5, color: 'text.secondary' }}>
                {description}
              </Typography>
              {to && (
                <Box component={Link} to={to} sx={enlace}>
                  {cta}
                  <ArrowForwardIcon />
                </Box>
              )}
              {href && (
                <Box component="a" href={href} target="_blank" rel="noopener" sx={enlace}>
                  {cta}
                  <ArrowForwardIcon />
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

import { Box } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Link } from 'react-router-dom'

import { section, shell } from '../../../components/ui/publicStyles'
import { ESQUEMA_OSCURO } from '../landingTokens'
import Reveal from './Reveal'
import { Acento, Eyebrow, Titulo } from './Tipografia'
import VitrinaModelos from './VitrinaModelos'

export default function CatalogHighlight() {
  return (
    <Box
      component="section"
      id="disponibles"
      aria-labelledby="disponibles-titulo"
      {...ESQUEMA_OSCURO}
      sx={{ ...section(false), color: '#fff' }}
    >
      <Box sx={shell}>
        <Reveal
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Eyebrow n="02">
              En el mostrador
            </Eyebrow>
            <Titulo id="disponibles-titulo" sx={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}>
              Disponibles <Acento>ahora</Acento>
            </Titulo>
          </Box>

          {/* La flecha que avanza 3px es la única coquetería de la página, y
              sólo donde hay puntero fino. */}
          <Box
            component={Link}
            to="/catalogo"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '.9375rem',
              lineHeight: 1,
              '& svg': {
                fontSize: 16,
                transition: 'transform 220ms cubic-bezier(.23,1,.32,1)',
              },
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover svg': { transform: 'translateX(3px)' },
              },
            }}
          >
            Ver todo el catálogo
            <ArrowForwardIcon />
          </Box>
        </Reveal>

        <Reveal delay={120} sx={{ mt: 'clamp(2.5rem, 4.5vw, 3.5rem)' }}>
          <VitrinaModelos />
        </Reveal>
      </Box>
    </Box>
  )
}

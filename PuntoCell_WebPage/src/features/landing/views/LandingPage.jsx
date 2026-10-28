import { Box } from '@mui/material'
import { ProductProvider } from '../../catalogo/context/ProductContext'
import PublicNavbar from '../../../components/ui/PublicNavbar'
import LandingHero from '../components/LandingHero'
import ServiceShowcase from '../components/ServiceShowcase'
import CatalogHighlight from '../components/CatalogHighlight'
import Location from '../components/Location'
import PublicFooter from '../../../components/ui/PublicFooter'
import Velaris from '../../../components/ui/Velaris'
import { COLORES_FONDO, DISPLAY, ESQUEMA_OSCURO, NOCHE, SUPERFICIE } from '../landingTokens'
import '../landing.css'

export default function LandingPage() {
  return (
    <ProductProvider>
      {/* Toda la landing vive en la "noche" del hero: el esquema oscuro reasigna los tokens
          del tema acá adentro y `&&` pisa los fondos con el verde casi negro de marca, así
          navbar, tarjetas y pie se pintan solos sin tocar el catálogo. */}
      <Box
        component="main"
        {...ESQUEMA_OSCURO}
        sx={{
          minHeight: '100vh',
          bgcolor: NOCHE,
          color: 'text.primary',
          '&&': {
            '--pc-palette-background-default': NOCHE,
            '--pc-palette-background-paper': SUPERFICIE,
          },
        }}
      >
        {/* Un solo fondo para toda la página: la aurora del hero, fija detrás del contenido,
            así el verde acompaña el scroll en todas las secciones. */}
        <Velaris
          bg={NOCHE}
          colors={COLORES_FONDO}
          speed={1}
          grain={0.22}
          fallback={`radial-gradient(ellipse 80% 70% at 70% 40%, #12684e, ${NOCHE})`}
          sx={{ position: 'fixed', inset: 0, height: '100%', zIndex: 0 }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
        <PublicNavbar />
        <LandingHero />
        <ServiceShowcase />
        <CatalogHighlight />
        <Location />
        <PublicFooter />
        {/* Remate: el nombre gigante, casi translúcido y cortado por el borde inferior. Decorativo. */}
        <Box
          aria-hidden
          sx={{
            overflow: 'hidden',
            height: 'clamp(3.5rem, 11vw, 11rem)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 'clamp(4rem, 15.5vw, 17rem)',
              lineHeight: 0.8,
              letterSpacing: '-.05em',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              color: 'rgba(255,255,255,.055)',
            }}
          >
            PUNTO CELL
          </Box>
        </Box>
        </Box>
      </Box>
    </ProductProvider>
  )
}

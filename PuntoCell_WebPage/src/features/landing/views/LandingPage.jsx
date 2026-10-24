import { Box } from '@mui/material'
import { ProductProvider } from '../../catalogo/context/ProductContext'
import PublicNavbar from '../../../components/ui/PublicNavbar'
import LandingHero from '../components/LandingHero'
import Marquee from '../components/Marquee'
import ServiceShowcase from '../components/ServiceShowcase'
import CatalogHighlight from '../components/CatalogHighlight'
import Location from '../components/Location'
import PublicFooter from '../../../components/ui/PublicFooter'
import { ESQUEMA_OSCURO, NOCHE, SUPERFICIE } from '../landingTokens'
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
        <PublicNavbar />
        <LandingHero />
        <Marquee />
        <ServiceShowcase />
        <CatalogHighlight />
        <Location />
        <PublicFooter />
      </Box>
    </ProductProvider>
  )
}

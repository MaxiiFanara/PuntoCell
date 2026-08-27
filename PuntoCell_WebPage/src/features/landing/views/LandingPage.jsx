import { Box } from '@mui/material'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Services from '../components/Services'
import CatalogHighlight from '../components/CatalogHighlight'
import FooterCTA from '../components/FooterCTA'
// Team se muestra solo para la defensa del proyecto; se descomenta cuando hace falta.
// import Team from '../components/Team'

export default function LandingPage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Hero />
      <Services />
      <CatalogHighlight />
      {/* <Team /> */}
      <FooterCTA />
    </Box>
  )
}

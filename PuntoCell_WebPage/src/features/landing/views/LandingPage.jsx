import { Box } from '@mui/material'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Services from '../components/Services'
import CatalogHighlight from '../components/CatalogHighlight'
import Team from '../components/Team'
import FooterCTA from '../components/FooterCTA'

export default function LandingPage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Hero />
      <Services />
      <CatalogHighlight />
      <Team />
      <FooterCTA />
    </Box>
  )
}

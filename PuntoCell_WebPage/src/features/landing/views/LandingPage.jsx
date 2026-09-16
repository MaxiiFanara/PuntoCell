import { Box } from '@mui/material'
import { ProductProvider } from '../../catalogo/context/ProductContext'
import PublicNavbar from '../../../components/ui/PublicNavbar'
import Hero from '../components/Hero'
import Services from '../components/Services'
import CatalogHighlight from '../components/CatalogHighlight'
import Team from '../components/Team'
import PublicFooter from '../../../components/ui/PublicFooter'

export default function LandingPage() {
  return (
    <ProductProvider>
      <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <PublicNavbar />
        <Hero />
        <Services />
        <CatalogHighlight />
        <Team />
        <PublicFooter />
      </Box>
    </ProductProvider>
  )
}

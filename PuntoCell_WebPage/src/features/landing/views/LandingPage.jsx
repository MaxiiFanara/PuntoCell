import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Services from '../components/Services'
import CatalogHighlight from '../components/CatalogHighlight' // El nuevo catálogo
import Team from '../components/Team' // Mantenemos el equipo para la presentación académica
import FooterCTA from '../components/FooterCTA'

function App() {
  return (
    <main className="w-full min-h-screen font-sans bg-gray-50">
      <Navbar />
      <Hero />
      <Services />
      <CatalogHighlight /> 
      {/* Sección del equipo desarrollador para el tribunal evaluador */}
      {/* <Team /> */}
      <FooterCTA />
    </main>
  )
}

export default App
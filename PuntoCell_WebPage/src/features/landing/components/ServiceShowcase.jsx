import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, useMediaQuery } from '@mui/material'

import { shell } from '../../../components/ui/publicStyles'
import { ESQUEMA_OSCURO, NOCHE } from '../landingTokens'
import Reveal from './Reveal'
import { Acento, Eyebrow, Titulo } from './Tipografia'
import { lamina } from '../posters'

// El carrusel (y la librería WebGL que usa) se descarga recién cuando la sección
// está por verse: no pesa en la apertura de la landing.
const FlexCarousel = lazy(() => import('../../../components/ui/FlexCarousel'))

// Cuando haya fotos, agregar `src: '/images/...'` a un ítem reemplaza su lámina.
const LAMINAS = [
  {
    titulo: 'Equipos',
    descripcion: 'Nuevos y seminuevos verificados, con garantía del local y batería declarada.',
    tono: '#12684e',
  },
  {
    titulo: 'Servicio técnico',
    descripcion: 'Reparaciones en el día. Cambio de batería, módulos y diagnóstico con repuestos de calidad.',
    tono: '#0d5240',
  },
  {
    titulo: 'Accesorios',
    descripcion: 'Fundas, vidrios templados, cargadores originales y auriculares para cuidar tu equipo.',
    tono: '#177a5b',
  },
  { titulo: 'Garantía del local', descripcion: 'En equipos nuevos y seminuevos.', tono: '#0f5a43' },
  { titulo: 'Tomamos tu usado', descripcion: 'Como parte de pago.', tono: '#1a6e54' },
  { titulo: 'Pagá online', descripcion: 'Con Mercado Pago desde el catálogo.', tono: '#0b4a38' },
]

function hayWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

// Monta el carrusel cuando entra (casi) en pantalla, así su animación de entrada se ve.
function useCercaDePantalla() {
  const ref = useRef(null)
  const [cerca, setCerca] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCerca(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return [ref, cerca]
}

/** "Lo que se hace en el local": carrusel 3D de láminas. */
export default function ServiceShowcase() {
  const [ref, cerca] = useCercaDePantalla()
  const webgl2 = useMemo(() => hayWebGL2(), [])
  // En pantallas angostas la lente ocupa casi todo el ancho: se suaviza para que el texto se lea.
  const angosta = useMediaQuery('(max-width:700px)')

  const items = useMemo(
    () =>
      LAMINAS.map((s, i) => ({
        src: s.src ?? lamina({ numero: String(i + 1).padStart(2, '0'), titulo: s.titulo, descripcion: s.descripcion, tono: s.tono }),
        alt: `${s.titulo}. ${s.descripcion}`,
        title: s.titulo,
      })),
    [],
  )

  return (
    <Box
      component="section"
      id="servicios"
      aria-labelledby="servicios-titulo"
      {...ESQUEMA_OSCURO}
      sx={{ color: '#fff', pt: 'clamp(4.5rem, 9vw, 8rem)', pb: 'clamp(4rem, 8vw, 7rem)', overflow: 'hidden' }}
    >
      <Box sx={shell}>
        <Reveal>
          <Eyebrow n="01">El local</Eyebrow>
          <Titulo id="servicios-titulo" sx={{ maxWidth: '22ch' }}>
            Lo que se hace en <Acento>el local</Acento>
          </Titulo>
          <Typography sx={{ mt: 2.5, maxWidth: '40ch', fontSize: '1.125rem', lineHeight: 1.6, color: 'rgba(255,255,255,.78)' }}>
            Calidad, confianza y atención personalizada.
          </Typography>
        </Reveal>
      </Box>

      {webgl2 && (
        <Box
          ref={ref}
          sx={{
            position: 'relative',
            mt: 'clamp(1rem, 3vw, 2rem)',
            height: { xs: 460, md: 620 },
            color: '#fff',
          }}
        >
          {cerca && (
            <Suspense fallback={null}>
              <FlexCarousel
                items={items}
                label="Servicios y ventajas del local"
                preset="liquid"
                intro="rise"
                cardHeight={angosta ? 0.66 : 0.58}
                bend={angosta ? 0.14 : undefined}
                dispersion={angosta ? 0.2 : undefined}
                gap={14}
                squeeze={0.2}
                radius={18}
                flow={120}
                captions={false}
                captureWheel={false}
              />
            </Suspense>
          )}
        </Box>
      )}
    </Box>
  )
}

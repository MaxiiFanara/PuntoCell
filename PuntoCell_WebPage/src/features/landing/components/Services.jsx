import { Box, Typography } from '@mui/material'

import { section, shell } from '../../../components/ui/publicStyles'

const SERVICIOS = [
  {
    title: 'Equipos',
    description: 'Nuevos y seminuevos verificados, con garantía del local y batería declarada.',
  },
  {
    title: 'Servicio técnico',
    description: 'Reparaciones en el día. Cambio de batería, módulos y diagnóstico con repuestos de calidad.',
  },
  {
    title: 'Accesorios',
    description: 'Fundas, vidrios templados, cargadores originales y auriculares para cuidar tu equipo.',
  },
]

/**
 * Lo que se hace en el local.
 *
 * Filas editoriales anchas separadas por un filete, no tres cards iguales de
 * ícono + título + texto: esa estructura es la que el sistema prohíbe. Sin caja
 * y sin ícono, la separación la hacen el aire y la línea de 1px.
 */
export default function Services() {
  return (
    <Box component="section" sx={section(true)}>
      <Box sx={shell}>
        <Typography component="h2" sx={{ typography: 'd2' }}>
          Lo que se hace en el local
        </Typography>
        <Typography sx={{ typography: 'publicBody', mt: 2, maxWidth: '46ch', color: 'text.secondary' }}>
          Calidad, confianza y atención personalizada.
        </Typography>

        <Box sx={{ mt: 'clamp(2.5rem, 5vw, 4rem)', borderTop: 1, borderColor: 'divider' }}>
          {SERVICIOS.map((servicio) => (
            <Box
              key={servicio.title}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
                alignItems: { md: 'baseline' },
                gap: { xs: 1.5, md: 6 },
                py: 'clamp(2rem, 4vw, 3rem)',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography component="h3" sx={{ typography: 'd3' }}>
                {servicio.title}
              </Typography>
              <Typography sx={{ typography: 'publicBody', maxWidth: '58ch', color: 'text.secondary' }}>
                {servicio.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

import { Breadcrumbs, Link as MuiLink, Typography } from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { Link } from 'react-router-dom'

import { muted } from '../../../components/ui/publicStyles'

// Los eslabones que son enlace: atenuados, y sólo se encienden donde hay puntero
// fino. En táctil el hover se dispara al tocar y deja el estado pegado.
const enlace = {
  ...muted,
  fontSize: '.875rem',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': { color: 'text.primary' },
  },
}

// La hoja de la ruta: tinta plena y peso 500. No lleva 600, que en este tamaño
// compite con el título de la vista.
const hoja = { fontSize: '.875rem', color: 'text.primary', fontWeight: 500 }

/**
 * Ruta de navegación de la vitrina. Con `current` (el nombre del producto)
 * "Catálogo" pasa a ser enlace y el producto queda como hoja.
 */
export default function CatalogBreadcrumbs({ current }) {
  return (
    <Breadcrumbs
      aria-label="Ruta de navegación"
      separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
      sx={{
        mb: 3,
        '& .MuiBreadcrumbs-separator': { mx: 0.5, color: 'pc.textMuted', opacity: 0.6 },
      }}
    >
      <MuiLink component={Link} to="/" underline="hover" sx={enlace}>
        Inicio
      </MuiLink>

      {current ? (
        <MuiLink component={Link} to="/catalogo" underline="hover" sx={enlace}>
          Catálogo
        </MuiLink>
      ) : (
        <Typography sx={hoja}>Catálogo</Typography>
      )}

      {current && (
        <Typography
          sx={{
            ...hoja,
            maxWidth: { xs: 180, sm: 420 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {current}
        </Typography>
      )}
    </Breadcrumbs>
  )
}

import { Box, Typography } from '@mui/material'

import { STORE_CONFIG } from '../../features/catalogo/config/store'
import { muted, shell } from './publicStyles'
import Team from '../../features/landing/components/Team'

const { name } = STORE_CONFIG.business

/**
 * Cierre único de la cara pública (landing + catálogo): el pie con el nombre del
 * local, el aviso del proyecto y los créditos. La banda de llamada a la acción
 * ("¿No encontrás el modelo que buscás?") se quitó a pedido.
 */
export default function PublicFooter() {
  return (
    <Box component="footer">
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ ...shell, py: 5.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '.875rem', color: 'text.secondary' }}>
            {name} · La Calera, Córdoba, Argentina
          </Typography>
          <Typography sx={{ ...muted, mt: 0.5, fontSize: '.8125rem' }}>
            © {new Date().getFullYear()} · Vitrina online del sistema de gestión {name}. Proyecto final de carrera.
          </Typography>
          <Team />
        </Box>
      </Box>
    </Box>
  )
}

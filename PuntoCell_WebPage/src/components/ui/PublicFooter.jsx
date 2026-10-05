import { Box, Button, Typography } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import InstagramIcon from '@mui/icons-material/Instagram'

import { STORE_CONFIG } from '../../features/catalogo/config/store'
import { btn, muted, section, shell } from './publicStyles'

const { whatsapp, instagram, name } = STORE_CONFIG.business
const whatsappUrl = `https://wa.me/${whatsapp}`

/**
 * Cierre único de la cara pública (landing + catálogo).
 *
 * La banda verde es el único bloque de color de toda la página, y es la llamada
 * a la acción: el verde marca el precio y marca la compra, nada más.
 *
 * El texto de encima va con `primary.contrastText`, nunca con un blanco fijo: en
 * tema oscuro `primary.main` es un menta claro y el blanco cae a 2.3:1.
 */
export default function PublicFooter() {
  return (
    <Box component="footer">
      <Box
        className="on-primary"
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <Box sx={{ ...shell, ...section(), textAlign: 'center' }}>
          <Box sx={{ maxWidth: '44ch', mx: 'auto' }}>
            <Typography component="h2" sx={{ typography: 'd2' }}>
              ¿No encontrás el modelo que buscás?
            </Typography>
            <Typography
              sx={{
                typography: 'publicBody',
                mt: 2,
                color: 'color-mix(in srgb, currentColor 88%, transparent)',
              }}
            >
              Escribinos y te lo cotizamos. Tomamos tu equipo usado como parte de pago
              y resolvemos tus dudas técnicas al instante.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 4, flexWrap: 'wrap' }}>
              <Button
                href={whatsappUrl}
                target="_blank"
                rel="noopener"
                startIcon={<WhatsAppIcon />}
                sx={{
                  ...btn,
                  bgcolor: 'primary.contrastText',
                  color: 'primary.main',
                  border: 1,
                  borderColor: 'primary.contrastText',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-contrastText) 92%, var(--pc-palette-primary-main))' },
                  },
                }}
              >
                Consultar por WhatsApp
              </Button>

              {instagram && (
                <Button
                  href={instagram}
                  target="_blank"
                  rel="noopener"
                  startIcon={<InstagramIcon />}
                  sx={{
                    ...btn,
                    color: 'inherit',
                    border: 1,
                    borderColor: 'color-mix(in srgb, currentColor 45%, transparent)',
                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': {
                        borderColor: 'currentColor',
                        bgcolor: 'color-mix(in srgb, currentColor 12%, transparent)',
                      },
                    },
                  }}
                >
                  Instagram
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ ...shell, py: 5.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '.875rem', color: 'text.secondary' }}>
            {name} · La Calera, Córdoba, Argentina
          </Typography>
          <Typography sx={{ ...muted, mt: 0.5, fontSize: '.8125rem' }}>
            © {new Date().getFullYear()} · Vitrina online del sistema de gestión {name}. Proyecto final de carrera.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

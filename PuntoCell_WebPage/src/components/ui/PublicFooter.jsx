import { Box, Button, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';

import { STORE_CONFIG } from '../../features/catalogo/config/store';

const { whatsapp, instagram, name } = STORE_CONFIG.business;
const whatsappUrl = `https://wa.me/${whatsapp}`;

/**
 * Cierre único de la cara pública (landing + catálogo).
 *
 * El catálogo tenía su propio footer con la marca a 2.5rem, iconos de 52px y
 * otro ritmo de espaciado: mismo contenido que este, con otra estética. Uno
 * solo para las dos vistas.
 */
export default function PublicFooter() {
  return (
    <Box component="footer">
      {/* Banda de cierre en verde de marca: funciona igual en claro y oscuro. */}
      <Box sx={{ px: 2.5, py: { xs: 7, md: 9 }, bgcolor: 'pc.accentSoft', color: 'primary.main', textAlign: 'center' }}>
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <Typography
            component="h2"
            sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' }, fontWeight: 600, letterSpacing: '-.03em', textWrap: 'balance' }}
          >
            ¿No encontrás el modelo que buscás?
          </Typography>
          <Typography sx={{ mt: 2, fontSize: '1rem', lineHeight: 1.6, opacity: .85 }}>
            Escribinos y te lo cotizamos. Tomamos tu equipo usado como parte de pago
            y resolvemos tus dudas técnicas al instante.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 4, flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" href={whatsappUrl} target="_blank" rel="noopener"
              startIcon={<WhatsAppIcon sx={{ fontSize: '18px !important' }} />}>
              Consultar por WhatsApp
            </Button>
            {instagram && (
              <Button size="large" href={instagram} target="_blank" rel="noopener"
                startIcon={<InstagramIcon sx={{ fontSize: '18px !important' }} />}
                sx={{ color: 'inherit' }}>
                Instagram
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{
        px: 2.5, py: 3.5, textAlign: 'center',
        bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
      }}>
        <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary' }}>
          {name} · La Calera, Córdoba, Argentina
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '.75rem', color: 'text.disabled' }}>
          © {new Date().getFullYear()} · Vitrina online del sistema de gestión {name}. Proyecto final de carrera.
        </Typography>
      </Box>
    </Box>
  );
}

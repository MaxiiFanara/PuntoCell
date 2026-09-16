import { Fab, Tooltip, Zoom } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { STORE_CONFIG } from '../config/store';

// Este botón comparte la esquina inferior derecha con el ThemeToggle global
// (52px, bottom 28, right 28 — ver components/ui/ThemeToggle). Antes se
// superponían y el de WhatsApp, con zIndex 9999, tapaba el switch de tema: por
// eso no se podía volver a claro desde el catálogo. Ahora se apilan.
const TOGGLE_SIZE = 52;
const GAP = 14;

export default function WhatsappFloating() {
  const message = encodeURIComponent(
    `¡Hola! Quisiera hacer una consulta sobre los productos de ${STORE_CONFIG.business.name}.`
  );

  const whatsappUrl = `https://wa.me/${STORE_CONFIG.business.whatsapp}?text=${message}`;

  return (
    <Zoom in>
      <Tooltip title="Escribinos por WhatsApp" placement="left" arrow disableTouchListener>
        <Fab
          component="a"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          sx={(theme) => ({
            position: 'fixed',
            bottom: 28 + TOGGLE_SIZE + GAP,
            right: 28,
            width: TOGGLE_SIZE,
            height: TOGGLE_SIZE,
            minHeight: TOGGLE_SIZE,
            // Por debajo del Drawer del carrito (1200) para no flotar sobre él.
            zIndex: theme.zIndex.fab,
            bgcolor: '#25D366',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(37,211,102,.32)',
            transition: 'transform .15s, background-color .15s, box-shadow .15s',
            '&:hover': {
              bgcolor: '#1ebe5d',
              transform: 'scale(1.10)',
              boxShadow: '0 10px 30px rgba(37,211,102,.42)',
            },
            '&:active': { transform: 'scale(0.92)' },
            '@media print': { display: 'none' },
          })}
        >
          <WhatsAppIcon sx={{ fontSize: 26 }} />
        </Fab>
      </Tooltip>
    </Zoom>
  );
}

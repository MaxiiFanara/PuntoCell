import {
  Fab,
  Tooltip,
  Zoom,
  useMediaQuery,
} from '@mui/material';

import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { useTheme } from '@mui/material/styles';

import { STORE_CONFIG } from '../config/store';

export default function WhatsappFloating() {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const message = encodeURIComponent(
    `¡Hola! Quisiera hacer una consulta sobre los productos de ${STORE_CONFIG.business.name}.`
  );

  const whatsappUrl =
    `https://wa.me/${STORE_CONFIG.business.whatsapp}?text=${message}`;

  return (
    <Zoom in>
      <Tooltip
        title="Escribinos por WhatsApp"
        placement="left"
        arrow
        disableTouchListener
      >
        <Fab
          component="a"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          size={isMobile ? 'medium' : 'large'}
          sx={{
            position: 'fixed',

            bottom: {
              xs: 18,
              md: 28,
            },

            right: {
              xs: 18,
              md: 28,
            },

            bgcolor: '#25D366',

            color: 'white',

            zIndex: 9999,

            boxShadow:
              '0 10px 30px rgba(37,211,102,0.35)',

            transition: 'all 0.25s ease',

            animation: 'whatsappPulse 2.5s infinite',

            '&:hover': {
              bgcolor: '#1ebe5d',

              transform: 'translateY(-4px) scale(1.05)',

              boxShadow:
                '0 14px 36px rgba(37,211,102,0.45)',
            },

            '@keyframes whatsappPulse': {
              '0%': {
                transform: 'scale(1)',
              },

              '50%': {
                transform: 'scale(1.05)',
              },

              '100%': {
                transform: 'scale(1)',
              },
            },
          }}
        >
          <WhatsAppIcon
            sx={{
              fontSize: {
                xs: 28,
                md: 32,
              },
            }}
          />
        </Fab>
      </Tooltip>
    </Zoom>
  );
}
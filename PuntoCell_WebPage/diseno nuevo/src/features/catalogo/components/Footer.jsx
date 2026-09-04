import {
  Box,
  Container,
  Typography,
  Stack,
  IconButton,
  Divider,
} from '@mui/material';

import InstagramIcon from '@mui/icons-material/Instagram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { useTheme } from '@mui/material/styles';

import { STORE_CONFIG } from '../config/store';

export default function Footer() {

  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        mt: 10,

        pt: {
          xs: 7,
          md: 9,
        },

        pb: 5,

        backgroundColor:
          theme.custom.footer.background,

        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="xl">
        <Stack
          spacing={4}
          alignItems="center"
          textAlign="center"
        >
          {/* Marca */}
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontSize: {
                  xs: '2rem',
                  md: '2.5rem',
                },

                mb: 1,
              }}
            >
              {STORE_CONFIG.business.name}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                maxWidth: 560,

                color: 'text.secondary',

                mx: 'auto',

                lineHeight: 1.8,
              }}
            >
              {STORE_CONFIG.hero.description}
            </Typography>
          </Box>

          {/* Redes */}
          <Stack
            direction="row"
            spacing={1.5}
          >
            <IconButton
              href={STORE_CONFIG.business.instagram}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                width: 52,
                height: 52,

                bgcolor:
                  theme.custom.cards.softBackground,

                color:
                  theme.palette.text.primary,

                transition: 'all 0.25s ease',

                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <InstagramIcon />
            </IconButton>

            <IconButton
              href={`https://wa.me/${STORE_CONFIG.business.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                width: 52,
                height: 52,

                bgcolor:
                  theme.custom.cards.softBackground,

                color:
                  theme.palette.text.primary,

                transition: 'all 0.25s ease',

                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <WhatsAppIcon />
            </IconButton>
          </Stack>

          {/* Línea */}
          <Divider
            sx={{
              width: '100%',
              maxWidth: 320,
            }}
          />

          {/* Copyright */}
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',

              fontSize: '0.75rem',

              letterSpacing: '0.04em',
            }}
          >
            © {new Date().getFullYear()} {' '}
            {STORE_CONFIG.business.name}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
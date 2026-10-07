import { Badge, Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import LockPersonIcon from '@mui/icons-material/LockPerson'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined' // ☀️ Ícono modo claro
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'   // 🌙 Ícono modo oscuro
import { useColorScheme } from '@mui/material/styles'                     // Hook de tema de MUI
import { Link, useLocation } from 'react-router-dom'

import { useCart } from '../../features/catalogo/context/CartContext'
import { btn, shell } from './publicStyles'
import FontSizeSelect from './FontSizeSelect'

export default function PublicNavbar() {
  const { pathname } = useLocation()
  const cart = useCart()
  const enCatalogo = pathname.startsWith('/catalogo')

  // Control de modo oscuro/claro
  const { mode, setMode } = useColorScheme()
  const esOscuro = mode === 'dark'

  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 72,
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'color-mix(in srgb, var(--pc-palette-background-default) 88%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box
          component={Link}
          to="/"
          aria-label="Punto Cell, inicio"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none' }}
        >
          <Box
            aria-hidden
            sx={{
              width: 32,
              height: 32,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '8px',
              bgcolor: 'text.primary',
              color: 'background.default',
              fontWeight: 600,
              fontSize: '.78rem',
              letterSpacing: '-.02em',
            }}
          >
            PC
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-.03em', color: 'text.primary' }}>
            Punto Cell
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!enCatalogo && (
            <Button
              component={Link}
              to="/catalogo"
              sx={{ ...btn, height: 38, px: 1.5, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Catálogo
            </Button>
          )}

          <Button
            component={Link}
            to="/login"
            variant="outlined"
            startIcon={<LockPersonIcon />}
            sx={{ ...btn, height: 38, px: 2 }}
          >
            Gestión
          </Button>

          <Box sx={{ mx: 0.5 }}><FontSizeSelect /></Box>

          {/* Botón de cambio de tema en la barra pública */}
          <Tooltip title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
            <IconButton
              onClick={() => setMode(esOscuro ? 'light' : 'dark')}
              aria-label="Cambiar modo de color"
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: '8px',
                width: 38,
                height: 38,
                color: 'text.primary',
                transition: 'background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                '&:active': { transform: 'scale(.94)' },
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': { bgcolor: 'pc.surfaceMuted', borderColor: 'text.disabled' },
                },
              }}
            >
              {esOscuro ? <LightModeOutlinedIcon sx={{ fontSize: 19 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>

          {cart && (
            <Tooltip title="Tu carrito">
              <IconButton
                onClick={() => cart.setIsOpen(true)}
                aria-label={`Abrir carrito (${cart.totalItems} productos)`}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '8px',
                  width: 38,
                  height: 38,
                  color: 'text.primary',
                  transition: 'background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
                  '&:active': { transform: 'scale(.94)' },
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: 'pc.surfaceMuted', borderColor: 'text.disabled' },
                  },
                }}
              >
                <Badge
                  badgeContent={cart.totalItems}
                  color="primary"
                  slotProps={{ badge: { className: 'mono', sx: { fontSize: '.6875rem', fontWeight: 500 } } }}
                >
                  <ShoppingCartOutlinedIcon sx={{ fontSize: 19 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  )
}
import { useState } from 'react'
import { Badge, Box, Button, IconButton, Popover, Tooltip, Typography } from '@mui/material'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
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

  // Tamaño de letra y modo de color agrupados en un solo menú de ajustes
  const [ajustes, setAjustes] = useState(null)

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
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
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

          <Tooltip title="Ajustes de visualización">
            <IconButton
              onClick={(e) => setAjustes(e.currentTarget)}
              aria-label="Ajustes de visualización"
              aria-haspopup="true"
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
              <TuneOutlinedIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>

          <Popover
            open={Boolean(ajustes)}
            anchorEl={ajustes}
            onClose={() => setAjustes(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ p: 2, display: 'grid', gap: 2, minWidth: 220 }}>
              <Box>
                <Typography sx={{ fontSize: '.8125rem', color: 'pc.textMuted', mb: 0.75 }}>Tamaño de letra</Typography>
                <FontSizeSelect />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '.8125rem', color: 'pc.textMuted', mb: 0.75 }}>Modo de color</Typography>
                <Button
                  variant="outlined"
                  onClick={() => setMode(esOscuro ? 'light' : 'dark')}
                  startIcon={esOscuro ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                  sx={{ ...btn, height: 40, width: '100%' }}
                >
                  {esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                </Button>
              </Box>
            </Box>
          </Popover>

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
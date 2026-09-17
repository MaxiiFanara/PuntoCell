import { Badge, Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import LockPersonIcon from '@mui/icons-material/LockPerson'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { Link, useLocation } from 'react-router-dom'

import { useCart } from '../../features/catalogo/context/CartContext'
import { btn, shell } from './publicStyles'

/**
 * Barra única de la cara pública (landing + catálogo).
 *
 * 72px en vez de los 64 de antes: la vitrina respira más que el panel. El fondo
 * es el de la página con una transparencia y desenfoque, así el contenido pasa
 * por debajo en vez de chocar contra una banda opaca.
 *
 * El botón del carrito se dibuja únicamente donde hay CartProvider: fuera del
 * catálogo `useCart()` devuelve undefined y la barra sigue funcionando.
 */
export default function PublicNavbar() {
  const { pathname } = useLocation()
  const cart = useCart()
  const enCatalogo = pathname.startsWith('/catalogo')

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
          {/* El monograma va en la tinta del texto, no en verde: el verde está
              reservado al precio, la acción primaria y el anillo de foco. */}
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

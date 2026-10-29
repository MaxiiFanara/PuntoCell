import { Box, Button, IconButton, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { Link, useLocation } from 'react-router-dom'

import { useCompare, MAX_COMPARAR } from '../context/CompareContext'
import { useProducts } from '../context/ProductContext'
import { COLORES_SERIES } from '../utils/metricasComparador'
import { muted } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'
import './comparador.css'

/**
 * Barra fija con los productos elegidos para comparar. Aparece cuando hay al
 * menos uno y se oculta en la propia pantalla de comparación. Se apoya a la
 * izquierda del botón de WhatsApp y del chat, que viven abajo a la derecha.
 */
export default function CompareBar() {
  const { ids, remove, clear } = useCompare()
  const { products } = useProducts()
  const { pathname } = useLocation()
  const { mode, systemMode } = useColorScheme()
  const oscuro = (mode === 'system' ? systemMode : mode) === 'dark'

  if (ids.length === 0 || pathname.startsWith('/catalogo/comparar')) return null

  const elegidos = ids.map((id) => products.find((p) => String(p.id) === id)).filter(Boolean)
  const puedeComparar = ids.length >= 2

  return (
    <Box
      className="cmp-barra"
      sx={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        right: { xs: 16, md: 'auto' },
        zIndex: 1200,
        maxWidth: { md: 680 },
        p: 1,
        pl: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        borderRadius: '28px',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 24px rgba(0,0,0,.18), 0 2px 4px -2px rgba(0,0,0,.12)',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0, alignItems: 'center' }}>
        {elegidos.map((p, i) => (
          <Box
            key={p.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              p: 0.5,
              pr: 0.25,
              borderRadius: 99,
              maxWidth: 210,
              bgcolor: 'color-mix(in srgb, var(--pc-palette-text-primary) 6%, transparent)',
            }}
          >
            {/* Miniatura con el color que tendrá en el radar. */}
            <Box
              sx={{
                flex: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                background: oscuro
                  ? 'radial-gradient(ellipse 80% 75% at 50% 42%, #f4f7f5 0%, #c9dbd1 100%)'
                  : 'radial-gradient(ellipse 80% 75% at 50% 42%, #ffffff 0%, #e6eeea 100%)',
                outline: `2px solid ${COLORES_SERIES[i % COLORES_SERIES.length]}`,
                outlineOffset: 1,
              }}
            >
              {p.imagenPortada && (
                <img src={p.imagenPortada} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
              )}
            </Box>
            <Typography noWrap sx={{ fontSize: '.8125rem', fontWeight: 500, letterSpacing: '-.014em' }}>{p.name}</Typography>
            <IconButton
              size="small"
              onClick={() => remove(p.id)}
              aria-label={`Quitar ${p.name} de la comparación`}
              sx={{
                transition: 'transform 160ms cubic-bezier(.23,1,.32,1), background-color 180ms ease',
                '&:active': { transform: 'scale(.9)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ))}
        <Typography sx={{ ...muted, fontFamily: MONO, fontSize: '.75rem', ml: 0.5 }}>
          {ids.length}/{MAX_COMPARAR}{!puedeComparar && ' · elegí al menos 2'}
        </Typography>
      </Box>

      <Button
        size="small"
        onClick={clear}
        sx={{ color: 'text.secondary', borderRadius: 99, px: 1.5, transition: 'transform 160ms cubic-bezier(.23,1,.32,1)', '&:active': { transform: 'scale(.95)' } }}
      >
        Vaciar
      </Button>
      <Button
        component={Link}
        to={`/catalogo/comparar?ids=${ids.join(',')}`}
        disabled={!puedeComparar}
        variant="contained"
        sx={{
          height: 44,
          px: 3,
          borderRadius: 99,
          fontSize: '.9375rem',
          boxShadow: puedeComparar ? '0 4px 24px color-mix(in srgb, var(--pc-palette-primary-main) 40%, transparent)' : 'none',
          transition: 'transform 160ms cubic-bezier(.23,1,.32,1), background-color 180ms ease',
          '&:active': { transform: 'scale(.97)' },
        }}
      >
        Comparar
      </Button>
    </Box>
  )
}

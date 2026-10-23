import { Box, Button, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Link, useLocation } from 'react-router-dom'

import { useCompare, MAX_COMPARAR } from '../context/CompareContext'
import { useProducts } from '../context/ProductContext'
import { btn, muted } from '../../../components/ui/publicStyles'

/**
 * Barra fija con los productos elegidos para comparar. Aparece cuando hay al
 * menos uno y se oculta en la propia pantalla de comparación. Se apoya a la
 * izquierda del botón de WhatsApp y del chat, que viven abajo a la derecha.
 */
export default function CompareBar() {
  const { ids, remove, clear } = useCompare()
  const { products } = useProducts()
  const { pathname } = useLocation()

  if (ids.length === 0 || pathname.startsWith('/catalogo/comparar')) return null

  const elegidos = ids.map((id) => products.find((p) => String(p.id) === id)).filter(Boolean)
  const puedeComparar = ids.length >= 2

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        right: { xs: 16, md: 'auto' },
        zIndex: 1200,
        maxWidth: { md: 640 },
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
        {elegidos.map((p) => (
          <Box
            key={p.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1.25, border: 1, borderColor: 'divider', borderRadius: 99, maxWidth: 200 }}
          >
            <Typography noWrap sx={{ fontSize: '.8125rem', fontWeight: 500 }}>{p.name}</Typography>
            <IconButton size="small" onClick={() => remove(p.id)} aria-label={`Quitar ${p.name} de la comparación`}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ))}
        <Typography sx={{ ...muted, fontSize: '.8125rem', alignSelf: 'center' }}>
          {ids.length}/{MAX_COMPARAR}{!puedeComparar && ' · elegí al menos 2'}
        </Typography>
      </Box>

      <Button size="small" onClick={clear} sx={{ color: 'text.secondary' }}>Vaciar</Button>
      <Button
        component={Link}
        to={`/catalogo/comparar?ids=${ids.join(',')}`}
        disabled={!puedeComparar}
        variant="contained"
        size="small"
        sx={btn}
      >
        Comparar
      </Button>
    </Paper>
  )
}

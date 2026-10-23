import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import { catalogoService } from '../../../services/catalogoServices'
import { useProducts } from '../context/ProductContext'
import { useCompare } from '../context/CompareContext'
import CompararRadar from '../components/CompararRadar'
import { formatCurrency } from '../utils/whatsapp'
import { btn, muted, price as priceSx } from '../../../components/ui/publicStyles'

// Datos que el negocio sí conoce de cada unidad.
const FILAS_TIENDA = [
  { label: 'Estado', get: (p) => p.estado },
  { label: 'Almacenamiento', get: (p) => p.almacenamiento },
  { label: 'Memoria RAM', get: (p) => p.memoria },
  { label: 'Salud de batería', get: (p) => p.bateria },
  { label: 'Color', get: (p) => p.color },
  { label: 'Sucursal', get: (p) => p.sucursal },
]

// Ficha técnica del modelo (mobileapi.dev). Los valores vienen en inglés.
const SECCIONES_FICHA = [
  ['Pantalla', 'display', [['Tamaño', 'size'], ['Tipo', 'type'], ['Resolución', 'resolution'], ['Protección', 'protection']]],
  ['Rendimiento', 'platform', [['Sistema', 'os'], ['Chipset', 'chipset'], ['CPU', 'cpu'], ['GPU', 'gpu']]],
  ['Memoria', 'memory', [['Configuraciones', 'internal'], ['Ranura de tarjeta', 'card_slot']]],
  ['Cámara principal', 'main_camera', [['Módulos', 'modules'], ['Funciones', 'features'], ['Video', 'video']]],
  ['Cámara frontal', 'selfie_camera', [['Módulos', 'modules'], ['Video', 'video']]],
  ['Batería', 'battery', [['Tipo', 'type'], ['Carga', 'charging']]],
  ['Conectividad', 'comms', [['Wi-Fi', 'wlan'], ['Bluetooth', 'bluetooth'], ['NFC', 'nfc'], ['USB', 'usb']]],
  ['Cuerpo', 'body', [['Dimensiones', 'dimensions'], ['Peso', 'weight'], ['Construcción', 'build'], ['SIM', 'sim'], ['Resistencia', 'other']]],
  ['Red', 'network', [['Tecnología', 'technology']]],
]

const MOTIVOS = {
  'no-encontrado': 'Sin ficha técnica disponible',
  cupo: 'Ficha técnica no disponible por ahora',
  error: 'Ficha técnica no disponible por ahora',
  'sin-clave': 'Ficha técnica no disponible',
}

function Fila({ label, valores, destacada = false }) {
  if (valores.every((v) => !v)) return null
  return (
    <Box
      role="row"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: `repeat(${valores.length}, minmax(140px, 1fr))`, md: `180px repeat(${valores.length}, 1fr)` },
        gap: 2,
        py: 1.25,
        borderTop: 1,
        borderColor: 'divider',
        fontSize: '.875rem',
      }}
    >
      <Typography sx={{ ...muted, fontSize: 'inherit', gridColumn: { xs: `1 / -1`, md: 'auto' } }}>{label}</Typography>
      {valores.map((v, i) => (
        <Typography key={i} sx={{ fontSize: 'inherit', fontWeight: destacada ? 600 : 400, overflowWrap: 'anywhere', ...(!v && muted) }}>
          {v || '—'}
        </Typography>
      ))}
    </Box>
  )
}

function Titulo({ children }) {
  return (
    <Typography component="h2" sx={{ mt: 4, mb: 0.5, fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-.02em' }}>
      {children}
    </Typography>
  )
}

export default function CompararPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { products } = useProducts()
  const { ids: seleccion } = useCompare()

  // La URL manda (se puede compartir); si viene vacía se usa la selección guardada.
  const ids = (searchParams.get('ids') || seleccion.join(',')).split(',').filter(Boolean)
  const clave = ids.join(',')

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    setDatos(null)
    setError(null)
    if (ids.length < 2) return undefined
    catalogoService
      .comparar(ids)
      .then((d) => !cancelado && setDatos(d))
      .catch((e) => !cancelado && setError(e.message || 'No se pudo cargar la comparación'))
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const volver = (
    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/catalogo')} sx={{ ...btn, mb: 2, color: 'text.secondary' }}>
      Volver al catálogo
    </Button>
  )

  if (ids.length < 2) {
    return (
      <Box>
        {volver}
        <Alert severity="info">Elegí al menos 2 celulares o tablets desde el catálogo para compararlos.</Alert>
      </Box>
    )
  }
  if (error) {
    return (
      <Box>
        {volver}
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }
  if (!datos) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  const items = datos.productos
  const imagenDe = (p) => products.find((x) => String(x.id) === p.id)?.imagenPortada
  const precios = items.map((p) => p.priceUsd)
  const menorPrecio = Math.min(...precios)

  return (
    <Box>
      {volver}
      <Typography component="h1" sx={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-.03em', mb: 3 }}>
        Comparar dispositivos
      </Typography>

      {/* 1. Fotos, nombres y precios */}
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: { xs: 1.5, md: 2 }, alignItems: 'start', mb: 5 }}>
        {items.map((p) => (
          <Box key={p.id}>
            <Box sx={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', mb: 1.5, borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
              {(imagenDe(p) || p.ficha?.specs?.imagen) && (
                <img src={imagenDe(p) || p.ficha.specs.imagen} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
            </Box>
            <Typography component={Link} to={`/catalogo/product/${p.id}`} sx={{ display: 'block', color: 'inherit', textDecoration: 'none', fontWeight: 600, lineHeight: 1.3 }}>
              {p.name}
            </Typography>
            <Typography sx={{ ...priceSx(), mt: 1 }}>${formatCurrency(p.priceUsd)}</Typography>
            {p.priceUsd === menorPrecio && new Set(precios).size > 1 && (
              <Typography sx={{ color: 'success.main', fontSize: '.75rem', fontWeight: 600 }}>Más económico</Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* 2. Gráfico de radar */}
      <CompararRadar productos={items} />

      {/* 3. Tabla con todos los detalles */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: { xs: items.length * 156, md: 0 } }}>
          {/* Nombres como encabezado de columnas: las fotos ya quedaron arriba. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: `repeat(${items.length}, minmax(140px, 1fr))`, md: `180px repeat(${items.length}, 1fr)` },
              gap: 2,
              pb: 1,
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' } }} />
            {items.map((p) => (
              <Typography key={p.id} sx={{ fontWeight: 600, fontSize: '.875rem', lineHeight: 1.3 }}>
                {p.name}
              </Typography>
            ))}
          </Box>

          <Titulo>En PuntoCell</Titulo>
          {FILAS_TIENDA.map((f) => (
            <Fila key={f.label} label={f.label} valores={items.map(f.get)} />
          ))}

          {SECCIONES_FICHA.map(([titulo, seccion, campos]) => {
            const hayDatos = items.some((p) => campos.some(([, campo]) => p.ficha?.specs?.[seccion]?.[campo]))
            if (!hayDatos) return null
            return (
              <Box key={seccion}>
                <Titulo>{titulo}</Titulo>
                {campos.map(([label, campo]) => (
                  <Fila key={campo} label={label} valores={items.map((p) => p.ficha?.specs?.[seccion]?.[campo])} />
                ))}
              </Box>
            )
          })}
        </Box>
      </Box>

      {items.some((p) => !p.ficha?.specs) && (
        <Alert severity="warning" sx={{ mt: 4 }}>
          {items
            .filter((p) => !p.ficha?.specs)
            .map((p) => `${p.name}: ${MOTIVOS[p.ficha?.motivo] || MOTIVOS.error}`)
            .join(' · ')}
        </Alert>
      )}
      <Typography sx={{ ...muted, fontSize: '.75rem', mt: 3 }}>
        Las especificaciones técnicas corresponden al modelo de fábrica (fuente: mobileapi.dev) y pueden variar según la versión.
        Estado, batería y color son los de la unidad que vendemos.
      </Typography>
    </Box>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Skeleton, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import { catalogoService } from '../../../services/catalogoServices'
import { useProducts } from '../context/ProductContext'
import { useCompare } from '../context/CompareContext'
import CompararRadar from '../components/CompararRadar'
import Aparece from '../components/Aparece'
import { aGb, armarRadar, COLORES_SERIES, maximo, numeros } from '../utils/metricasComparador'
import { formatCurrency } from '../utils/whatsapp'
import { DISPLAY, muted, price as priceSx, SERIF } from '../../../components/ui/publicStyles'
import { MONO } from '../../../theme'

// Cómo se lee un dato para saber cuál equipo "gana" esa fila. Sólo filas medibles; si a un equipo
// le falta el dato, o todos empatan, la fila no marca ganador.
const porcentaje = (v) => maximo(numeros(v, /(\d+(?:\.\d+)?)\s*%/g))
const PUNTAJES = {
  almacenamiento: (v) => aGb(v),
  ram: (v) => aGb(v),
  saludBateria: porcentaje,
  'display.size': (v) => maximo(numeros(v, /([\d.]+)\s*inches/gi)),
  'display.resolution': (v) => maximo(numeros(v, /(\d+)\s*ppi/gi)),
  'battery.type': (v) => maximo(numeros(v, /(\d+)\s*mAh/gi)),
  'main_camera.modules': (v) => numeros(v, /(\d+(?:\.\d+)?)\s*MP/gi)[0] ?? null,
}

// Datos que el negocio sí conoce de cada unidad.
const FILAS_TIENDA = [
  { label: 'Estado', get: (p) => p.estado },
  { label: 'Almacenamiento', get: (p) => p.almacenamiento, puntaje: PUNTAJES.almacenamiento },
  { label: 'Memoria RAM', get: (p) => p.memoria, puntaje: PUNTAJES.ram },
  { label: 'Salud de batería', get: (p) => p.bateria, puntaje: PUNTAJES.saludBateria },
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

const SOMBRA = '0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.08)'

// Una grilla para el encabezado y para cada fila: si no, las columnas no alinean.
const columnas = (n) => ({
  xs: `repeat(${n}, minmax(150px, 1fr))`,
  md: `190px repeat(${n}, minmax(0, 1fr))`,
})

// El dato clave primero y el resto atenuado debajo: "6.5 inches" y después "102.0 cm2(~85.7%...)".
const partir = (valor) => {
  const s = String(valor)
  if (s.length <= 30) return [s, '']
  const i = s.search(/[,(]/)
  if (i <= 0) return [s, '']
  return [s.slice(0, i).trim(), s.slice(i).replace(/^,\s*/, '')]
}

function Fila({ label, valores, puntaje }) {
  if (valores.every((v) => !v)) return null

  const puntos = puntaje ? valores.map((v) => (v ? puntaje(String(v)) : null)) : []
  const validos = puntos.filter((n) => n !== null && n !== undefined)
  const mejor = validos.length >= 2 && Math.max(...validos) > Math.min(...validos) ? Math.max(...validos) : null

  return (
    <Box
      role="row"
      className="cmp-fila"
      sx={{
        display: 'grid',
        gridTemplateColumns: columnas(valores.length),
        gap: 2,
        px: { xs: 2, md: 3 },
        py: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        alignItems: 'baseline',
      }}
    >
      <Typography
        sx={{
          ...muted,
          fontFamily: MONO,
          fontSize: '.75rem',
          letterSpacing: '.02em',
          gridColumn: { xs: '1 / -1', md: 'auto' },
        }}
      >
        {label}
      </Typography>
      {valores.map((v, i) => {
        if (!v) {
          return (
            <Typography key={i} sx={{ ...muted, fontSize: '.9375rem' }}>
              —
            </Typography>
          )
        }
        const gana = mejor !== null && puntos[i] === mejor
        const [principal, resto] = partir(v)
        return (
          <Box key={i} sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
                fontSize: '.9375rem',
                fontWeight: gana ? 700 : 500,
                lineHeight: 1.4,
                letterSpacing: '-.014em',
                overflowWrap: 'anywhere',
              }}
            >
              {gana && (
                <Box
                  aria-hidden
                  component="span"
                  sx={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', transform: 'translateY(-1px)' }}
                />
              )}
              <span>
                {principal}
                {gana && <span style={visuallyHidden}> (mejor valor)</span>}
              </span>
            </Typography>
            {resto && (
              <Typography sx={{ ...muted, fontSize: '.8125rem', lineHeight: 1.45, mt: 0.25, overflowWrap: 'anywhere' }}>{resto}</Typography>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

// Un bloque de la tabla: título numerado y las filas sobre una superficie con sombra suave.
function Seccion({ numero, titulo, children }) {
  return (
    <Aparece component="section" sx={{ mt: 6 }}>
      <Typography sx={{ fontFamily: MONO, fontSize: '.8125rem', fontWeight: 500, color: 'pc.textMuted' }}>
        <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>
          ({String(numero).padStart(2, '0')})
        </Box>
        {titulo}
      </Typography>
      <Box
        sx={{
          mt: 1.5,
          borderRadius: '28px',
          bgcolor: 'background.paper',
          boxShadow: SOMBRA,
          overflow: 'hidden',
          '& > [role="row"]:first-of-type': { borderTop: 0 },
        }}
      >
        {children}
      </Box>
    </Aparece>
  )
}

function Cargando({ n }) {
  // Si la ficha todavía no está guardada, la primera consulta puede tardar bastante.
  const [largo, setLargo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLargo(true), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: { xs: 1.5, md: 2.5 }, mb: 3 }}>
        {[...Array(n)].map((_, i) => (
          <Box key={i} sx={{ p: 1, borderRadius: '28px', bgcolor: 'background.paper', boxShadow: SOMBRA }}>
            <Skeleton variant="rectangular" animation="wave" sx={{ aspectRatio: '4 / 3', borderRadius: '20px' }} />
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.0625rem', width: '70%' }} />
              <Skeleton variant="text" animation="wave" sx={{ fontSize: '1.5rem', width: '40%' }} />
            </Box>
          </Box>
        ))}
      </Box>
      <Typography role="status" sx={{ ...muted, textAlign: 'center', fontSize: '.9375rem' }}>
        {largo
          ? 'Es la primera vez que se consulta este modelo y puede tardar un poco más. Ya casi está.'
          : 'Buscando la ficha técnica…'}
      </Typography>
    </Box>
  )
}

export default function CompararPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { products } = useProducts()
  const { ids: seleccion } = useCompare()
  const { mode, systemMode } = useColorScheme()
  const oscuro = (mode === 'system' ? systemMode : mode) === 'dark'

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
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate('/catalogo')}
      sx={{
        mb: 4,
        height: 44,
        px: 2.5,
        borderRadius: 99,
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        fontSize: '.9375rem',
        transition: 'transform 160ms cubic-bezier(.23,1,.32,1), box-shadow 180ms ease',
        '&:active': { transform: 'scale(.97)' },
        '&:hover': { bgcolor: 'background.paper' },
        '@media (hover: hover) and (pointer: fine)': { '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,.12)' } },
      }}
    >
      Volver al catálogo
    </Button>
  )

  const cabecera = (cantidad) => (
    <Box sx={{ mb: { xs: 4, md: 5 } }}>
      {cantidad > 0 && (
        <Typography sx={{ fontFamily: MONO, fontSize: '.8125rem', fontWeight: 500, color: 'pc.textMuted' }}>
          <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>({cantidad})</Box>
          equipos
        </Typography>
      )}
      <Typography
        component="h1"
        sx={{
          mt: 1,
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)',
          lineHeight: 0.98,
          letterSpacing: '-.045em',
        }}
      >
        Comparar{' '}
        <Box component="span" sx={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.06em', letterSpacing: '-.02em', color: 'primary.main' }}>
          dispositivos
        </Box>
      </Typography>
    </Box>
  )

  const alerta = { borderRadius: '20px' }

  if (ids.length < 2) {
    return (
      <Box>
        {volver}
        {cabecera(0)}
        <Alert severity="info" sx={alerta}>Elegí al menos 2 celulares o tablets desde el catálogo para compararlos.</Alert>
      </Box>
    )
  }
  if (error) {
    return (
      <Box>
        {volver}
        {cabecera(0)}
        <Alert severity="error" sx={alerta}>{error}</Alert>
      </Box>
    )
  }
  if (!datos) {
    return (
      <Box>
        {volver}
        {cabecera(ids.length)}
        <Cargando n={ids.length} />
      </Box>
    )
  }

  const items = datos.productos
  const imagenDe = (p) => products.find((x) => String(x.id) === p.id)?.imagenPortada || p.ficha?.specs?.imagen
  const precios = items.map((p) => p.priceUsd)
  const menorPrecio = Math.min(...precios)
  const hayDiferenciaDePrecio = new Set(precios).size > 1

  // Numeración de los bloques: el radar es el 01 si se dibuja.
  let contador = armarRadar(items) ? 1 : 0
  const bloques = [
    { numero: ++contador, titulo: 'En PuntoCell', filas: FILAS_TIENDA.map((f) => ({ key: f.label, label: f.label, valores: items.map(f.get), puntaje: f.puntaje })) },
  ]
  for (const [titulo, seccion, campos] of SECCIONES_FICHA) {
    const hayDatos = items.some((p) => campos.some(([, campo]) => p.ficha?.specs?.[seccion]?.[campo]))
    if (!hayDatos) continue
    bloques.push({
      numero: ++contador,
      titulo,
      filas: campos.map(([label, campo]) => ({
        key: campo,
        label,
        valores: items.map((p) => p.ficha?.specs?.[seccion]?.[campo]),
        puntaje: PUNTAJES[`${seccion}.${campo}`],
      })),
    })
  }

  const escenario = oscuro
    ? 'radial-gradient(ellipse 80% 75% at 50% 42%, #f4f7f5 0%, #c9dbd1 100%)'
    : 'radial-gradient(ellipse 80% 75% at 50% 42%, #ffffff 0%, #e6eeea 100%)'

  return (
    <Box>
      {volver}
      {cabecera(items.length)}

      {/* 1. Fotos, nombres y precios */}
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: { xs: 1.5, md: 2.5 }, alignItems: 'start', mb: 6 }}>
        {items.map((p, i) => {
          const foto = imagenDe(p)
          return (
            <Aparece
              key={p.id}
              demora={i * 70}
              sx={{ p: 1, borderRadius: '28px', bgcolor: 'background.paper', boxShadow: SOMBRA }}
            >
              <Box sx={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', borderRadius: '20px', overflow: 'hidden', background: escenario }}>
                {foto && <img src={foto} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />}
              </Box>
              <Box sx={{ px: { xs: 0.75, md: 1.5 }, pt: 1.75, pb: 1.5 }}>
                <Typography
                  component={Link}
                  to={`/catalogo/product/${p.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'inherit',
                    textDecoration: 'none',
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: { xs: '.875rem', md: '1.0625rem' },
                    letterSpacing: '-.03em',
                    lineHeight: 1.25,
                  }}
                >
                  {/* Mismo color que su trazo en el radar: hace de leyenda. */}
                  <Box aria-hidden component="span" sx={{ flex: 'none', width: 10, height: 10, borderRadius: '50%', bgcolor: COLORES_SERIES[i % COLORES_SERIES.length] }} />
                  {p.name}
                </Typography>
                <Typography sx={{ ...priceSx(), fontSize: { xs: '1rem', md: '1.625rem' }, mt: 1.25, overflowWrap: 'anywhere' }}>${formatCurrency(p.priceUsd)}</Typography>
                {p.priceUsd === menorPrecio && hayDiferenciaDePrecio && (
                  <Typography
                    component="span"
                    sx={{
                      display: 'inline-block',
                      mt: 1.25,
                      px: 1.25,
                      py: 0.6,
                      borderRadius: 99,
                      fontSize: '.75rem',
                      fontWeight: 600,
                      lineHeight: 1,
                      color: 'primary.main',
                      bgcolor: 'color-mix(in srgb, var(--pc-palette-primary-main) 12%, transparent)',
                    }}
                  >
                    Más económico
                  </Typography>
                )}
              </Box>
            </Aparece>
          )
        })}
      </Box>

      {/* 2. Gráfico de radar */}
      <CompararRadar productos={items} />

      {/* 3. Tabla con todos los detalles */}
      <Box sx={{ overflowX: { xs: 'auto', md: 'visible' } }}>
        <Box sx={{ minWidth: { xs: items.length * 166, md: 0 } }}>
          {/* Encabezado de columnas: queda fijo bajo el navbar al recorrer la tabla (en pantallas
              anchas), así siempre se sabe a qué equipo corresponde cada columna. */}
          <Box
            sx={{
              position: { md: 'sticky' },
              top: { md: 72 },
              zIndex: 5,
              display: 'grid',
              gridTemplateColumns: columnas(items.length),
              gap: 2,
              px: { xs: 2, md: 3 },
              py: 1.25,
              borderRadius: '20px',
              bgcolor: 'color-mix(in srgb, var(--pc-palette-background-default) 88%, transparent)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 1px 0 var(--pc-palette-divider)',
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' } }} />
            {items.map((p, i) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Box
                  sx={{
                    flex: 'none',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    background: escenario,
                    outline: `2px solid ${COLORES_SERIES[i % COLORES_SERIES.length]}`,
                    outlineOffset: 1,
                  }}
                >
                  {imagenDe(p) && (
                    <img src={imagenDe(p)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '.9375rem', letterSpacing: '-.025em', lineHeight: 1.2 }}>
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: '.75rem', color: 'primary.main' }}>${formatCurrency(p.priceUsd)}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {bloques.map((b) => (
            <Seccion key={b.titulo} numero={b.numero} titulo={b.titulo}>
              {b.filas.map((f) => (
                <Fila key={f.key} label={f.label} valores={f.valores} puntaje={f.puntaje} />
              ))}
            </Seccion>
          ))}
        </Box>
      </Box>

      {items.some((p) => !p.ficha?.specs) && (
        <Alert severity="warning" sx={{ ...alerta, mt: 5 }}>
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

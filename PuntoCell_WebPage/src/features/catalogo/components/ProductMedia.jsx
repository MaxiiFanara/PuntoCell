import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'

const ES_MODELO = /\.(glb|gltf)(\?.*)?$/i

// model-viewer lanza una excepción si no hay contexto WebGL (por ejemplo con la
// aceleración por hardware apagada) y deja el área en blanco. Se prueba antes.
function hayWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const FILL = { position: 'absolute', inset: 0 }

function Fallback({ children }) {
  return (
    <Box sx={{ ...FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
      {children}
    </Box>
  )
}

function Modelo({ src, alt, fallback, interactive, orientation, poster }) {
  // null = todavía no se sabe; el visor se importa recién cuando hay WebGL.
  const [estado, setEstado] = useState('cargando')
  const ref = useRef(null)

  useEffect(() => {
    if (!hayWebGL()) {
      setEstado('error')
      return undefined
    }
    let activo = true
    import('@google/model-viewer')
      .then(() => activo && setEstado('listo'))
      .catch(() => activo && setEstado('error'))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const onError = () => setEstado('error')
    el.addEventListener('error', onError)
    return () => el.removeEventListener('error', onError)
  }, [estado])

  if (estado === 'error') return <Fallback>{fallback}</Fallback>
  if (estado === 'cargando') return poster ? <img src={poster} alt={alt} style={{ ...FILL, width: '100%', height: '100%', objectFit: 'contain' }} /> : null

  return (
    <>
      <model-viewer
        ref={ref}
        src={src}
        alt={alt}
        poster={poster}
        auto-rotate=""
        environment-image="neutral"
        shadow-intensity="1"
        orientation={orientation}
        {...(interactive && {
          'camera-controls': '',
          'min-camera-orbit': 'auto 0deg auto',
          'max-camera-orbit': 'auto 180deg auto',
        })}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', '--poster-color': 'transparent' }}
      />
      {interactive && (
        <Typography
          component="span"
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 1.25,
            py: 0.5,
            borderRadius: 99,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            color: 'text.secondary',
            fontSize: '.75rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Arrastra para girar 360°
        </Typography>
      )}
    </>
  )
}

function Foto({ src, alt, tilt }) {
  const ref = useRef(null)

  const mover = (e) => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.style.setProperty('--glow', '1')
    if (tilt) {
      el.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg)`
    }
  }

  const salir = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--glow', '0')
    el.style.transform = ''
  }

  return (
    <Box
      ref={ref}
      onMouseMove={mover}
      onMouseLeave={salir}
      sx={{
        ...FILL,
        transition: 'transform .2s ease-out',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 'var(--glow, 0)',
          transition: 'opacity .2s',
          background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.22), transparent 55%)',
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <img src={src} alt={alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>
  )
}

/**
 * Medio visual de un producto. Llena su contenedor (que debe ser `position: relative`):
 * `.glb`/`.gltf` -> visor 3D; cualquier otra cosa -> `<img>`.
 */
export default function ProductMedia({
  src,
  alt = '',
  fallback = null,
  interactive = false,
  orientation = '0deg 0deg 0deg',
  tilt = false,
  poster,
}) {
  if (!src) return <Fallback>{fallback}</Fallback>
  if (ES_MODELO.test(src)) {
    return (
      <Modelo src={src} alt={alt} fallback={fallback} interactive={interactive} orientation={orientation} poster={poster} />
    )
  }
  return <Foto src={src} alt={alt} tilt={tilt} />
}

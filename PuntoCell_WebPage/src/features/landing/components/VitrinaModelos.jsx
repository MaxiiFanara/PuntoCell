import { useEffect, useRef, useState } from 'react'
import { Box, Typography, useMediaQuery } from '@mui/material'

import CategoriaIcon from '../../catalogo/components/CategoriaIcon'
import ProductMedia from '../../catalogo/components/ProductMedia'
import { DISPLAY, EASE, MENTA, MONO, SUPERFICIE } from '../landingTokens'

/**
 * Selección fija del mostrador. Los modelos viven en /public/models.
 * Sólo el panel abierto monta el visor 3D: los .glb pesan entre 2 y 9 MB.
 */
const PRODUCTOS = [
  {
    id: 's26',
    nombre: 'Galaxy S26',
    marca: 'Samsung',
    categoria: 'Celulares',
    modelo: '/models/samsung-galaxy-s26.glb',
    frase: 'Pantalla AMOLED a 120 Hz y cámara que no se achica de noche.',
    specs: ['6,3" AMOLED', '256 GB', '5G'],
  },
  {
    id: 'iphone-15-pro',
    nombre: 'iPhone 15 Pro',
    marca: 'Apple',
    categoria: 'Celulares',
    modelo: '/models/apple-iphone-15-pro.glb',
    frase: 'Titanio, chip A17 Pro y USB-C. Liviano y rápido.',
    specs: ['6,1" OLED', 'A17 Pro', 'USB-C'],
  },
  {
    id: 'iphone-12-pro',
    nombre: 'iPhone 12 Pro',
    marca: 'Apple',
    categoria: 'Celulares',
    modelo: '/models/apple-iphone-12-pro.glb',
    frase: 'Acero y vidrio. El clásico que todavía rinde de sobra.',
    specs: ['6,1" OLED', 'A14 Bionic', 'MagSafe'],
  },
  {
    id: 's24-ultra',
    nombre: 'Galaxy S24 Ultra',
    marca: 'Samsung',
    categoria: 'Celulares',
    modelo: '/models/samsung-galaxy-s24-ultra.glb',
    frase: 'Marco de titanio, S Pen integrado y zoom de 100x.',
    specs: ['6,8" QHD+', 'S Pen', 'Zoom 100x'],
  },
]

const N = (i) => String(i + 1).padStart(2, '0')

const pastilla = {
  fontFamily: MONO,
  fontSize: '.6875rem',
  fontWeight: 500,
  letterSpacing: '.04em',
  lineHeight: 1,
  px: 1.25,
  py: 0.75,
  borderRadius: 99,
  border: '1px solid rgba(255,255,255,.18)',
  color: 'rgba(255,255,255,.82)',
  whiteSpace: 'nowrap',
}

function Panel({ producto, i, activo, vertical, onAbrir, onEntrar, onTecla, registrar }) {
  const transicion = `flex 620ms ${EASE}, background-color 320ms ease, border-color 320ms ease`

  return (
    <Box
      ref={registrar}
      role="button"
      tabIndex={0}
      aria-expanded={activo}
      aria-label={`${producto.marca} ${producto.nombre}`}
      onClick={() => !activo && onAbrir(i)}
      onMouseEnter={(e) => onEntrar(i, e)}
      onKeyDown={(e) => onTecla(i, e)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        minHeight: 0,
        borderRadius: '20px',
        border: '1px solid',
        borderColor: activo ? 'rgba(61,220,151,.35)' : 'rgba(255,255,255,.08)',
        bgcolor: activo ? SUPERFICIE : 'rgba(255,255,255,.025)',
        cursor: activo ? 'default' : 'pointer',
        outline: 'none',
        flex: activo ? '1 1 0' : vertical ? '0 0 76px' : '1 1 0',
        ...(activo && !vertical && { flexGrow: 3.4 }),
        transition: transicion,
        '&:focus-visible': { boxShadow: `0 0 0 2px ${MENTA}` },
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': activo ? undefined : { bgcolor: 'rgba(255,255,255,.05)' },
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {/* Índice: siempre visible, ancla la lectura de la fila. */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          top: 18,
          left: 20,
          zIndex: 2,
          fontFamily: MONO,
          fontSize: '.75rem',
          letterSpacing: '.1em',
          color: activo ? MENTA : 'rgba(255,255,255,.5)',
          transition: 'color 320ms ease',
        }}
      >
        {N(i)}
      </Typography>

      {/* Cerrado: sólo el nombre, vertical en fila y horizontal en columna. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: vertical ? 'center' : 'flex-end',
          justifyContent: vertical ? 'flex-start' : 'center',
          pl: vertical ? 7 : 0,
          pb: vertical ? 0 : 3,
          opacity: activo ? 0 : 1,
          transition: `opacity ${activo ? 120 : 380}ms ease ${activo ? 0 : 220}ms`,
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: vertical ? '1.0625rem' : '1.25rem',
            letterSpacing: '-.02em',
            color: 'rgba(255,255,255,.88)',
            ...(!vertical && { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }),
            whiteSpace: 'nowrap',
          }}
        >
          {producto.nombre}
        </Typography>
      </Box>

      {/* Abierto: el modelo 3D y la ficha. Se monta recién con el panel activo. */}
      {activo && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            animation: `vitrinaEntra 520ms ${EASE} 160ms both`,
            '@keyframes vitrinaEntra': {
              from: { opacity: 0, transform: 'translateY(8px)' },
              to: { opacity: 1, transform: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box sx={{ position: 'relative', flex: vertical ? '1 1 0' : '1.15 1 0', minHeight: 0, minWidth: 0 }}>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '12% 6%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(61,220,151,.30), transparent 68%)',
                filter: 'blur(26px)',
              }}
            />
            <ProductMedia
              src={producto.modelo}
              alt={`Modelo 3D del ${producto.marca} ${producto.nombre}`}
              interactive
              fallback={<CategoriaIcon categoria={producto.categoria} sx={{ fontSize: 96 }} />}
            />
          </Box>

          <Box
            sx={{
              flex: vertical ? '0 0 auto' : '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: vertical ? 'flex-end' : 'center',
              gap: 1.5,
              p: vertical ? '0 20px 20px' : '32px 36px 32px 8px',
            }}
          >
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '.6875rem',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: MENTA,
              }}
            >
              {producto.marca}
            </Typography>
            <Typography
              component="h3"
              sx={{
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: vertical ? '1.625rem' : 'clamp(1.75rem, 2.6vw, 2.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-.03em',
                color: '#fff',
              }}
            >
              {producto.nombre}
            </Typography>
            <Typography sx={{ fontSize: '.9375rem', lineHeight: 1.5, color: 'rgba(255,255,255,.68)', maxWidth: '34ch' }}>
              {producto.frase}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {producto.specs.map((s) => (
                <Typography key={s} component="span" sx={pastilla}>
                  {s}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default function VitrinaModelos() {
  const vertical = useMediaQuery('(max-width:700px)')
  // Sin mouse (celular, tablet) no hay hover: el panel se abre con el toque.
  const conHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [activo, setActivo] = useState(0)
  const paneles = useRef([])
  const espera = useRef(null)

  useEffect(() => () => clearTimeout(espera.current), [])

  // Con hover, un pequeño retardo evita que pasar el mouse de largo cambie de panel;
  // y con un botón apretado (arrastrando el modelo) nunca cambia.
  const entrar = (i, e) => {
    if (!conHover) return
    clearTimeout(espera.current)
    if (e.buttons !== 0 || i === activo) return
    espera.current = setTimeout(() => setActivo(i), 110)
  }

  const abrir = (i) => {
    clearTimeout(espera.current)
    setActivo(i)
  }

  const tecla = (i, e) => {
    const n = PRODUCTOS.length
    if (e.key === 'Enter' || e.key === ' ') {
      if (i !== activo) {
        e.preventDefault()
        abrir(i)
      }
    } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      const sig = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : n - 1)) % n
      abrir(sig)
      paneles.current[sig]?.focus()
    }
  }

  return (
    <Box>
      <Box
        role="group"
        aria-label="Selección de productos"
        onMouseLeave={() => clearTimeout(espera.current)}
        sx={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          gap: '12px',
          height: vertical ? 720 : 540,
        }}
      >
        {PRODUCTOS.map((p, i) => (
          <Panel
            key={p.id}
            producto={p}
            i={i}
            activo={i === activo}
            vertical={vertical}
            onAbrir={abrir}
            onEntrar={entrar}
            onTecla={tecla}
            registrar={(el) => (paneles.current[i] = el)}
          />
        ))}
      </Box>
    </Box>
  )
}

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
    id: 's24-ultra',
    nombre: 'Galaxy S24 Ultra',
    marca: 'Samsung',
    categoria: 'Celulares',
    modelo: '/models/samsung-galaxy-s24-ultra.glb',
    frase: 'Marco de titanio, S Pen integrado y zoom de 100x.',
    specs: ['6,8" QHD+', 'S Pen', 'Zoom 100x'],
  },
  {
    id: 'iphone-14-pro-max',
    nombre: 'iPhone 14 Pro Max',
    marca: 'Apple',
    categoria: 'Celulares',
    modelo: '/models/apple-iphone-14-pro-max.glb',
    frase: 'Dynamic Island, cámara de 48 MP y pantalla siempre activa.',
    specs: ['6,7" OLED', 'A16 Bionic', '48 MP'],
  },
  {
    id: 's26-ultra',
    nombre: 'Galaxy S26 Ultra',
    marca: 'Samsung',
    categoria: 'Celulares',
    modelo: '/models/samsung-galaxy-s26-ultra.glb',
    frase: 'El tope de gama de Samsung: pantalla enorme y zoom de largo alcance.',
    specs: ['6,9" QHD+', 'S Pen', '5G'],
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
    id: 's24',
    nombre: 'Galaxy S24',
    marca: 'Samsung',
    categoria: 'Celulares',
    modelo: '/models/samsung-galaxy-s24.glb',
    frase: 'Compacto, con Galaxy AI y una pantalla que se ve en pleno sol.',
    specs: ['6,2" AMOLED', 'Galaxy AI', '5G'],
  },
  {
    id: 'iphone-11-pro-max',
    nombre: 'iPhone 11 Pro Max',
    marca: 'Apple',
    categoria: 'Celulares',
    modelo: '/models/apple-iphone-11-pro-max.glb',
    frase: 'Triple cámara y batería para todo el día. Un clásico accesible.',
    specs: ['6,5" OLED', 'A13 Bionic', 'Triple cámara'],
  },
]

// Cuánto dura cada panel mientras la vitrina recorre sola los productos.
const TIEMPO_PANEL = 6000
// Sin que nadie toque la vitrina durante este tiempo, el recorrido automático se retoma.
const REPOSO = 12000

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

function Panel({ producto, i, activo, vertical, apilado, auto, pausado, onAbrir, onEntrar, onTecla, registrar }) {
  // 420ms: lo bastante largo para leer el cambio de panel, sin hacer esperar a quien recorre la fila.
  const transicion = `flex 420ms ${EASE}, background-color 200ms ease, border-color 200ms ease, transform 160ms ${EASE}`

  // `flex` es layout: mientras el panel crece, un visor 3D adentro se redimensionaría en cada
  // cuadro. El texto entra enseguida y el modelo se monta cuando el panel ya terminó de abrirse.
  const [entrado, setEntrado] = useState(false)
  const [montarModelo, setMontarModelo] = useState(false)
  useEffect(() => {
    if (!activo) {
      setEntrado(false)
      setMontarModelo(false)
      return undefined
    }
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let r2
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setEntrado(true))
    })
    const t = setTimeout(() => setMontarModelo(true), sinMovimiento ? 0 : 400)
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      clearTimeout(t)
    }
  }, [activo])

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
        ...(activo && !vertical && { flexGrow: 5 }),
        transition: transicion,
        '&:focus-visible': { boxShadow: `0 0 0 2px ${MENTA}` },
        // Un panel cerrado es un botón: se hunde un poco al presionarlo.
        ...(!activo && { '&:active': { transform: 'scale(.98)' } }),
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
          transition: 'color 200ms ease',
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
          transition: `opacity ${activo ? 100 : 200}ms ease ${activo ? 0 : 140}ms`,
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
      {/* Cuenta regresiva del recorrido automático: sólo es visual: el avance lo maneja el temporizador de la vitrina. */}
      {activo && auto && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3,
            height: 2,
            bgcolor: MENTA,
            transformOrigin: 'left',
            animation: `vitrinaTiempo ${TIEMPO_PANEL}ms linear both`,
            animationPlayState: pausado ? 'paused' : 'running',
            '@keyframes vitrinaTiempo': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
          }}
        />
      )}

      {activo && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: apilado ? 'column' : 'row',
            // Transición y no keyframes: con el auto-avance y el hover el panel cambia seguido
            // y una transición se reorienta sin reiniciar desde cero.
            opacity: entrado ? 1 : 0,
            transform: entrado ? 'none' : 'translateY(8px)',
            transition: `opacity 240ms ease-out 80ms, transform 240ms ${EASE} 80ms`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'opacity 160ms ease' },
          }}
        >
          <Box sx={{ position: 'relative', flex: apilado ? '1 1 0' : '1.15 1 0', minHeight: 0, minWidth: 0 }}>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '12% 6%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(61,220,151,.30), transparent 68%)',
                filter: 'blur(18px)',
              }}
            />
            {montarModelo && (
              <ProductMedia
                src={producto.modelo}
                alt={`Modelo 3D del ${producto.marca} ${producto.nombre}`}
                interactive
                fallback={<CategoriaIcon categoria={producto.categoria} sx={{ fontSize: 96 }} />}
              />
            )}
          </Box>

          <Box
            sx={{
              flex: apilado ? '0 0 auto' : '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: apilado ? 'flex-end' : 'center',
              gap: 1.5,
              p: apilado ? '0 24px 24px' : '32px 36px 32px 8px',
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
                fontSize: apilado ? '1.625rem' : 'clamp(1.75rem, 2.6vw, 2.5rem)',
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
  const raiz = useRef(null)

  // El recorrido automático muestra los 3D a quien no los toca. Se pausa cuando la
  // persona interactúa y se retoma tras un rato sin actividad.
  const [auto, setAuto] = useState(true)
  const [encima, setEncima] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pestana, setPestana] = useState(true)

  const reposo = useRef(null)
  const restante = useRef(TIEMPO_PANEL)
  const encimaRef = useRef(false)
  useEffect(
    () => () => {
      clearTimeout(espera.current)
      clearTimeout(reposo.current)
    },
    [],
  )

  // Sólo avanza mientras la vitrina está en pantalla y la pestaña a la vista.
  useEffect(() => {
    const el = raiz.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    const onVis = () => setPestana(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Cada interacción pausa el recorrido y rearma la cuenta del reposo; mientras el
  // puntero siga encima no se retoma, aunque haya pasado el tiempo.
  const programarReanudar = () => {
    clearTimeout(reposo.current)
    reposo.current = setTimeout(() => {
      if (encimaRef.current) {
        programarReanudar()
        return
      }
      restante.current = TIEMPO_PANEL
      setAuto(true)
    }, REPOSO)
  }
  const detener = () => {
    setAuto(false)
    programarReanudar()
  }
  const pausado = encima || !visible || !pestana

  // Temporizador con pausa: al pausar guarda lo que faltaba y al seguir lo retoma.
  // No depende de eventos CSS, así avanza aunque las animaciones estén desactivadas.
  const panelCronometrado = useRef(activo)
  useEffect(() => {
    if (!auto || pausado) return undefined
    if (panelCronometrado.current !== activo) {
      panelCronometrado.current = activo
      restante.current = TIEMPO_PANEL
    }
    const inicio = Date.now()
    const id = setTimeout(() => {
      restante.current = TIEMPO_PANEL
      setActivo((a) => (a + 1) % PRODUCTOS.length)
    }, restante.current)
    return () => {
      clearTimeout(id)
      restante.current = Math.max(0, restante.current - (Date.now() - inicio))
    }
  }, [auto, pausado, activo])

  // Con hover, un pequeño retardo evita que pasar el mouse de largo cambie de panel;
  // y con un botón apretado (arrastrando el modelo) nunca cambia.
  const entrar = (i, e) => {
    if (!conHover) return
    clearTimeout(espera.current)
    if (e.buttons !== 0 || i === activo) return
    espera.current = setTimeout(() => {
      detener()
      setActivo(i)
    }, 110)
  }

  const abrir = (i) => {
    clearTimeout(espera.current)
    detener()
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
        ref={raiz}
        onMouseEnter={() => {
          encimaRef.current = true
          setEncima(true)
        }}
        onMouseLeave={() => {
          clearTimeout(espera.current)
          encimaRef.current = false
          setEncima(false)
        }}
        onFocus={() => {
          encimaRef.current = true
          setEncima(true)
        }}
        onBlur={() => {
          encimaRef.current = false
          setEncima(false)
        }}
        onPointerDown={detener}
        sx={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          gap: '12px',
          height: vertical ? 76 * (PRODUCTOS.length - 1) + 12 * (PRODUCTOS.length - 1) + 440 : 560,
        }}
      >
        {PRODUCTOS.map((p, i) => (
          <Panel
            key={p.id}
            producto={p}
            i={i}
            activo={i === activo}
            vertical={vertical}
            apilado
            auto={auto}
            pausado={pausado}
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

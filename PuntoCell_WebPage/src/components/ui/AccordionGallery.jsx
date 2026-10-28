import { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'

import './AccordionGallery.css'

/**
 * Galería acordeón: el panel activo se expande y los demás se apilan en perspectiva.
 * Adaptada de React Bits (AccordionGallery):
 *  - cada ítem lleva `to` (navega con react-router) o `href` (enlace externo).
 *  - `content` es el bloque que se ve con el panel abierto y `tag` el título vertical
 *    del panel cerrado; con `variant="card"` la imagen se muestra entera (contain),
 *    sin recorte ni paralaje, pensada para fotos de producto sobre fondo claro.
 *  - sin `image` se dibuja `fallback`.
 *  - en táctil el primer toque abre el panel y el segundo sigue el enlace.
 */
const AccordionGallery = ({
  items,
  defaultIndex = 0,
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  grayscale = false,
  variant = 'media',
  label = 'Galería',
  className = '',
}) => {
  const rootRef = useRef(null)
  const panelRefs = useRef([])
  const mediaRefs = useRef([])
  const barRefs = useRef([])
  const textRefs = useRef([])
  const tlRef = useRef(null)
  const firstRunRef = useRef(true)
  const mediaSizeRef = useRef(320)

  const vertical = orientation === 'vertical'
  const card = variant === 'card'
  const count = items.length
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1))

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const applyLayout = useCallback(
    (animate) => {
      const panels = panelRefs.current
      if (!panels.length) return

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9)
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1
      const mediaSize = mediaSizeRef.current

      tlRef.current?.kill()
      const dur = animate && !prefersReduced ? duration : 0
      const tl = gsap.timeline()

      panels.forEach((panel, i) => {
        if (!panel) return
        const isActive = i === active
        const media = mediaRefs.current[i]
        const bar = barRefs.current[i]
        const text = textRefs.current[i]

        const rot = isActive ? 0 : i < active ? tilt : -tilt
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot }

        // `--ag-dim` va en el panel: la capa de atenuación es hija suya, no de la imagen.
        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, '--ag-dim': isActive ? 0 : 0.35, duration: dur, ease }, 0)

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i))
          const shift = drift * parallax * mediaSize * 0.06
          const base = { '--ag-gray': grayscale ? (isActive ? 0 : 1) : 0, duration: dur, ease }
          tl.to(
            media,
            card
              ? base
              : {
                  xPercent: -50,
                  yPercent: -50,
                  x: vertical ? 0 : isActive ? 0 : shift,
                  y: vertical ? (isActive ? 0 : shift) : 0,
                  ...base,
                },
            0,
          )
        }

        if (bar && text) {
          if (isActive) {
            tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger }, 0)
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0)
          }
        }
      })

      tlRef.current = tl
    },
    [active, count, expandRatio, duration, ease, vertical, card, tilt, parallax, grayscale, stagger, prefersReduced],
  )

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const total = vertical ? rect.height : rect.width
      const usable = Math.max(total - gap * (count - 1), 120)
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22)
      mediaSizeRef.current = size
      el.style.setProperty('--ag-media-size', `${size}px`)
      applyLayout(!firstRunRef.current)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyLayout, gap, count, expandRatio, vertical])

  useEffect(() => {
    applyLayout(!firstRunRef.current)
    firstRunRef.current = false
  }, [applyLayout])

  useEffect(
    () => () => {
      tlRef.current?.kill()
    },
    [],
  )

  const handleEnter = (i) => {
    if (trigger === 'hover') setActive(i)
  }

  // Panel cerrado: el toque lo abre. El siguiente toque (ya activo) sigue el enlace.
  const handleClick = (i, e) => {
    if (i !== active) {
      e.preventDefault()
      setActive(i)
    }
  }

  // Sólo el foco de teclado abre el panel: el foco de un toque/clic lo abriría antes
  // del click y el mismo toque ya navegaría.
  const handleFocus = (i, e) => {
    if (e.currentTarget.matches(':focus-visible')) setActive(i)
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (i + 1) % count
      setActive(next)
      panelRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (i - 1 + count) % count
      setActive(prev)
      panelRefs.current[prev]?.focus()
    }
  }

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${card ? ' accordion-gallery--card' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        height: `${height}px`,
      }}
      role="list"
      aria-label={label}
    >
      {items.map((item, i) => {
        const isActive = i === active
        const shared = {
          ref: (el) => (panelRefs.current[i] = el),
          className: `ag-panel${isActive ? ' ag-panel--active' : ''}`,
          style: { borderRadius: `${radius}px` },
          onClick: (e) => handleClick(i, e),
          onMouseEnter: () => handleEnter(i),
          onFocus: (e) => handleFocus(i, e),
          onKeyDown: (e) => handleKeyDown(i, e),
          role: 'listitem',
          tabIndex: 0,
          'aria-current': isActive ? 'true' : undefined,
          'aria-label': item.ariaLabel || item.tag,
        }

        const contenido = (
          <>
            <span className="ag-panel__frame">
              <span className="ag-panel__media" ref={(el) => (mediaRefs.current[i] = el)}>
                {item.image ? <img src={item.image} alt="" draggable="false" /> : item.fallback}
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>

            {/* Título vertical: es lo que se lee mientras el panel está cerrado. */}
            <span className="ag-panel__tag" aria-hidden="true">
              {item.tag}
            </span>

            <span className="ag-panel__label" aria-hidden="true">
              <span className="ag-panel__bar" ref={(el) => (barRefs.current[i] = el)} />
              <span className="ag-panel__body" ref={(el) => (textRefs.current[i] = el)}>
                {item.content}
              </span>
            </span>
          </>
        )

        if (item.to) {
          return (
            <Link key={item.key} to={item.to} {...shared}>
              {contenido}
            </Link>
          )
        }
        if (item.href) {
          return (
            <a key={item.key} href={item.href} target="_blank" rel="noopener" {...shared}>
              {contenido}
            </a>
          )
        }
        return (
          <div key={item.key} {...shared}>
            {contenido}
          </div>
        )
      })}
    </div>
  )
}

export default AccordionGallery

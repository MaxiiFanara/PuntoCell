import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

/**
 * Entrada al hacer scroll: fundido y 14px de subida, una sola vez. El estilo vive en
 * landing.css (`.lp-reveal`) y sólo oculta si el usuario no pidió menos movimiento.
 */
export default function Reveal({ children, delay = 0, sx, ...rest }) {
  const ref = useRef(null)
  const [visto, setVisto] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisto(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Box
      ref={ref}
      className="lp-reveal"
      data-visto={visto ? '' : undefined}
      style={{ '--lp-delay': `${delay}ms` }}
      sx={sx}
      {...rest}
    >
      {children}
    </Box>
  )
}

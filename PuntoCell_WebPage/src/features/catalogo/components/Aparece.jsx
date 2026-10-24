import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

import './comparador.css'

/**
 * Entrada al llegar a la vista: fundido y 14px de subida, una sola vez. El estilo vive en
 * comparador.css y sólo oculta si el usuario no pidió menos movimiento.
 */
export default function Aparece({ children, demora = 0, clase = 'cmp-aparece', sx, ...rest }) {
  const ref = useRef(null)
  const [visto, setVisto] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
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
    <Box ref={ref} className={clase} data-visto={visto ? '' : undefined} style={{ '--cmp-demora': `${demora}ms` }} sx={sx} {...rest}>
      {children}
    </Box>
  )
}
